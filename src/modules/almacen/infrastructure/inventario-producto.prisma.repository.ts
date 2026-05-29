import type {
  IInventarioProductoRepository,
  VarianteStockData,
  CrearAjusteDTO,
  ActualizarAjusteDTO,
  AprobarAjusteDTO,
  AjusteDoc,
  AprobarAjusteResultado,
  CrearRecuentoDTO,
  ActualizarRecuentoDTO,
  AprobarRecuentoDTO,
  RecuentoDoc,
  AprobarRecuentoResultado,
  InicializarBulkResultado,
  MovimientoSalidaDetalle,
} from "../domain/ports/IInventarioProductoRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import {
  ConflictoVersionError,
  DocumentoNoEncontradoError,
  DocumentoYaAprobadoError,
  StockNegativoError,
} from "../domain/almacen.errors.js"

export class InventarioProductoPrismaRepository implements IInventarioProductoRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async findVariante(varianteId: string, tenantId: string): Promise<VarianteStockData | null> {
    const raw = await this.db.productoVariante.findFirst({
      where: { id: varianteId, producto: { tenantId } },
      include: { producto: { select: { id: true, nombre: true, tenantId: true } } },
    })
    if (!raw) return null
    return {
      id: raw.id,
      productoId: raw.productoId,
      productoNombre: raw.producto.nombre,
      sku: raw.sku,
      cantidadStock: raw.cantidadStock,
      stockMinimo: raw.stockMinimo,
      inventarioActivado: raw.inventarioActivado,
    }
  }

  // ─── Función privada: recalcular stock del producto padre ────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async recalcularStockPadre(tx: any, productoId: string): Promise<void> {
    const variantes = await tx.productoVariante.findMany({
      where: { productoId },
      select: { cantidadStock: true },
    })
    const total = variantes.reduce((sum: number, v: { cantidadStock: number }) => sum + (v.cantidadStock ?? 0), 0)
    await tx.producto.update({
      where: { id: productoId },
      data: { cantidadStock: total },
    })
  }

  // ─── Ajustes ─────────────────────────────────────────────────────────────────

  async crearAjuste(dto: CrearAjusteDTO): Promise<AjusteDoc> {
    const ajuste = await this.db.ajusteInventario.create({
      data: {
        tenantId: dto.tenantId,
        motivo: dto.motivo ?? null,
        estado: "PENDIENTE",
        version: 0,
        tenantMemberId: dto.tenantMemberId ?? null,
        createdById: dto.createdById ?? null,
        detalles: {
          create: dto.detalles.map((d) => ({
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            cantidadAjuste: d.cantidadAjuste,
            stockAnterior: 0,
            stockDespues: 0,
          })),
        },
      },
      include: { detalles: true },
    })
    return this.mapAjuste(ajuste)
  }

  async obtenerAjuste(id: string, tenantId: string): Promise<AjusteDoc | null> {
    const raw = await this.db.ajusteInventario.findFirst({
      where: { id, tenantId },
      include: { detalles: true },
    })
    if (!raw) return null
    return this.mapAjuste(raw)
  }

  async actualizarAjuste(id: string, tenantId: string, dto: ActualizarAjusteDTO): Promise<AjusteDoc> {
    const existing = await this.db.ajusteInventario.findFirst({ where: { id, tenantId } })
    if (!existing) throw new DocumentoNoEncontradoError("AJUSTE", id)
    if (existing.estado === "APROBADO") throw new DocumentoYaAprobadoError("ajuste")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { updatedById: dto.updatedById ?? null }
    if (dto.motivo !== undefined) updateData.motivo = dto.motivo
    if (dto.detalles !== undefined) {
      updateData.detalles = {
        deleteMany: {},
        create: dto.detalles.map((d) => ({
          productoId: d.productoId,
          varianteId: d.varianteId ?? null,
          cantidadAjuste: d.cantidadAjuste,
          stockAnterior: 0,
          stockDespues: 0,
        })),
      }
    }

    const updated = await this.db.ajusteInventario.update({
      where: { id },
      data: updateData,
      include: { detalles: true },
    })
    return this.mapAjuste(updated)
  }

  async aprobarAjuste(dto: AprobarAjusteDTO): Promise<AprobarAjusteResultado> {
    const ajuste = await this.db.ajusteInventario.findFirst({
      where: { id: dto.ajusteId, tenantId: dto.tenantId },
      include: { detalles: true },
    })
    if (!ajuste) throw new DocumentoNoEncontradoError("AJUSTE", dto.ajusteId)
    if (ajuste.estado === "APROBADO") throw new DocumentoYaAprobadoError("ajuste")
    if (ajuste.version !== dto.version) throw new ConflictoVersionError()

    // Pre-check: ningún stock resultante negativo
    const variantesActuales = await Promise.all(
      ajuste.detalles.map((d: { varianteId?: string; productoId: string }) =>
        d.varianteId
          ? this.db.productoVariante.findFirst({
              where: { id: d.varianteId, producto: { tenantId: dto.tenantId } },
              include: { producto: { select: { nombre: true } } },
            })
          : this.db.producto.findFirst({
              where: { id: d.productoId, tenantId: dto.tenantId },
            })
      )
    )

    for (let i = 0; i < ajuste.detalles.length; i++) {
      const d = ajuste.detalles[i]
      const v = variantesActuales[i]
      const stockActual = Number(v?.cantidadStock ?? 0)
      const stockResultante = stockActual + d.cantidadAjuste
      if (stockResultante < 0) {
        throw new StockNegativoError(d.productoId, stockResultante, d.varianteId ?? undefined)
      }
    }

    const resultadoDetalles: AprobarAjusteResultado["detalles"] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      for (let i = 0; i < ajuste.detalles.length; i++) {
        const d = ajuste.detalles[i]
        const v = variantesActuales[i]
        const stockAntes = Number(v?.cantidadStock ?? 0)
        const stockDespues = stockAntes + d.cantidadAjuste

        if (d.varianteId) {
          await tx.productoVariante.update({
            where: { id: d.varianteId },
            data: { cantidadStock: stockDespues },
          })
          await this.recalcularStockPadre(tx, d.productoId)
        } else {
          await tx.producto.update({
            where: { id: d.productoId },
            data: { cantidadStock: stockDespues },
          })
        }

        await tx.movimientoInventario.upsert({
          where: {
            tenantId_productoId_varianteId_tipo_referenciaId: {
              tenantId: dto.tenantId,
              productoId: d.productoId,
              varianteId: d.varianteId ?? null,
              tipo: "AJUSTE",
              referenciaId: dto.ajusteId,
            },
          },
          create: {
            tenantId: dto.tenantId,
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            tipo: "AJUSTE",
            cantidad: d.cantidadAjuste,
            motivo: ajuste.motivo ?? null,
            referenciaId: dto.ajusteId,
            stockAntes,
            stockDespues,
            createdById: dto.aprobadoPorId ?? null,
          },
          update: {
            cantidad: d.cantidadAjuste,
            stockAntes,
            stockDespues,
          },
        })

        await tx.ajusteDetalle.update({
          where: { id: d.id },
          data: { stockAnterior: stockAntes, stockDespues },
        })

        resultadoDetalles.push({
          productoId: d.productoId,
          varianteId: d.varianteId ?? null,
          stockAntes,
          stockDespues,
          stockMinimo: Number(v?.stockMinimo ?? 0),
          productoNombre: v?.producto?.nombre ?? v?.nombre ?? "",
          sku: v?.sku ?? null,
        })
      }

      await tx.ajusteInventario.update({
        where: { id: dto.ajusteId },
        data: { estado: "APROBADO", version: ajuste.version + 1, updatedById: dto.aprobadoPorId ?? null },
      })
    })

    return {
      ajusteId: dto.ajusteId,
      estado: "APROBADO",
      version: ajuste.version + 1,
      detalles: resultadoDetalles,
    }
  }

  // ─── Recuentos ───────────────────────────────────────────────────────────────

  async crearRecuento(dto: CrearRecuentoDTO): Promise<RecuentoDoc> {
    // Capturar stockSistema actual para cada variante
    const stocksActuales = await Promise.all(
      dto.detalles.map((d) =>
        d.varianteId
          ? this.db.productoVariante.findFirst({
              where: { id: d.varianteId, producto: { tenantId: dto.tenantId } },
              select: { cantidadStock: true },
            })
          : this.db.producto.findFirst({
              where: { id: d.productoId, tenantId: dto.tenantId },
              select: { cantidadStock: true },
            })
      )
    )

    const recuento = await this.db.recuentoInventario.create({
      data: {
        tenantId: dto.tenantId,
        observacion: dto.observacion ?? null,
        estado: "PENDIENTE",
        version: 0,
        tenantMemberId: dto.tenantMemberId ?? null,
        createdById: dto.createdById ?? null,
        detalles: {
          create: dto.detalles.map((d, i) => {
            const stockSistema = Number(stocksActuales[i]?.cantidadStock ?? 0)
            return {
              productoId: d.productoId,
              varianteId: d.varianteId ?? null,
              stockSistema,
              stockFisico: d.stockFisico,
              diferencia: d.stockFisico - stockSistema,
            }
          }),
        },
      },
      include: { detalles: true },
    })
    return this.mapRecuento(recuento)
  }

  async obtenerRecuento(id: string, tenantId: string): Promise<RecuentoDoc | null> {
    const raw = await this.db.recuentoInventario.findFirst({
      where: { id, tenantId },
      include: { detalles: true },
    })
    if (!raw) return null
    return this.mapRecuento(raw)
  }

  async actualizarRecuento(id: string, tenantId: string, dto: ActualizarRecuentoDTO): Promise<RecuentoDoc> {
    const existing = await this.db.recuentoInventario.findFirst({ where: { id, tenantId } })
    if (!existing) throw new DocumentoNoEncontradoError("RECUENTO", id)
    if (existing.estado === "APROBADO") throw new DocumentoYaAprobadoError("recuento")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { updatedById: dto.updatedById ?? null }
    if (dto.observacion !== undefined) updateData.observacion = dto.observacion
    if (dto.detalles !== undefined) {
      // Recapturar stockSistema para los detalles modificados
      const stocksActuales = await Promise.all(
        dto.detalles.map((d) =>
          d.varianteId
            ? this.db.productoVariante.findFirst({
                where: { id: d.varianteId, producto: { tenantId } },
                select: { cantidadStock: true },
              })
            : this.db.producto.findFirst({
                where: { id: d.productoId, tenantId },
                select: { cantidadStock: true },
              })
        )
      )
      updateData.detalles = {
        deleteMany: {},
        create: dto.detalles.map((d, i) => {
          const stockSistema = Number(stocksActuales[i]?.cantidadStock ?? 0)
          return {
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            stockSistema,
            stockFisico: d.stockFisico,
            diferencia: d.stockFisico - stockSistema,
          }
        }),
      }
    }

    const updated = await this.db.recuentoInventario.update({
      where: { id },
      data: updateData,
      include: { detalles: true },
    })
    return this.mapRecuento(updated)
  }

  async aprobarRecuento(dto: AprobarRecuentoDTO): Promise<AprobarRecuentoResultado> {
    const recuento = await this.db.recuentoInventario.findFirst({
      where: { id: dto.recuentoId, tenantId: dto.tenantId },
      include: { detalles: true },
    })
    if (!recuento) throw new DocumentoNoEncontradoError("RECUENTO", dto.recuentoId)
    if (recuento.estado === "APROBADO") throw new DocumentoYaAprobadoError("recuento")
    if (recuento.version !== dto.version) throw new ConflictoVersionError()

    // Pre-check: ningún stock resultante negativo
    const variantesActuales = await Promise.all(
      recuento.detalles.map((d: { varianteId?: string; productoId: string }) =>
        d.varianteId
          ? this.db.productoVariante.findFirst({
              where: { id: d.varianteId, producto: { tenantId: dto.tenantId } },
              include: { producto: { select: { nombre: true } } },
            })
          : this.db.producto.findFirst({
              where: { id: d.productoId, tenantId: dto.tenantId },
            })
      )
    )

    for (let i = 0; i < recuento.detalles.length; i++) {
      const d = recuento.detalles[i]
      const stockFisico = Number(d.stockFisico)
      if (stockFisico < 0) {
        throw new StockNegativoError(d.productoId, stockFisico, d.varianteId ?? undefined)
      }
    }

    const resultadoDetalles: AprobarRecuentoResultado["detalles"] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      for (let i = 0; i < recuento.detalles.length; i++) {
        const d = recuento.detalles[i]
        const v = variantesActuales[i]
        const stockAntes = Number(v?.cantidadStock ?? 0)
        const stockDespues = Number(d.stockFisico)
        const diferencia = Number(d.diferencia)

        if (d.varianteId) {
          await tx.productoVariante.update({
            where: { id: d.varianteId },
            data: { cantidadStock: stockDespues },
          })
          await this.recalcularStockPadre(tx, d.productoId)
        } else {
          await tx.producto.update({
            where: { id: d.productoId },
            data: { cantidadStock: stockDespues },
          })
        }

        await tx.movimientoInventario.upsert({
          where: {
            tenantId_productoId_varianteId_tipo_referenciaId: {
              tenantId: dto.tenantId,
              productoId: d.productoId,
              varianteId: d.varianteId ?? null,
              tipo: "RECUENTO",
              referenciaId: dto.recuentoId,
            },
          },
          create: {
            tenantId: dto.tenantId,
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            tipo: "RECUENTO",
            cantidad: diferencia,
            motivo: recuento.observacion ?? null,
            referenciaId: dto.recuentoId,
            stockAntes,
            stockDespues,
            createdById: dto.aprobadoPorId ?? null,
          },
          update: {
            cantidad: diferencia,
            stockAntes,
            stockDespues,
          },
        })

        await tx.recuentoDetalle.update({
          where: { id: d.id },
          data: { stockSistema: stockAntes },
        })

        resultadoDetalles.push({
          productoId: d.productoId,
          varianteId: d.varianteId ?? null,
          stockAntes,
          stockDespues,
          diferencia,
          stockMinimo: Number(v?.stockMinimo ?? 0),
          productoNombre: v?.producto?.nombre ?? v?.nombre ?? "",
          sku: v?.sku ?? null,
        })
      }

      await tx.recuentoInventario.update({
        where: { id: dto.recuentoId },
        data: { estado: "APROBADO", version: recuento.version + 1, updatedById: dto.aprobadoPorId ?? null },
      })
    })

    return {
      recuentoId: dto.recuentoId,
      estado: "APROBADO",
      version: recuento.version + 1,
      detalles: resultadoDetalles,
    }
  }

  // ─── Inicialización de stock ──────────────────────────────────────────────────

  async inicializarStockBulk(tenantId: string, createdById?: string): Promise<InicializarBulkResultado> {
    const [productos, variantes] = await Promise.all([
      this.db.producto.findMany({
        where: { tenantId, inventarioActivado: false },
        select: { id: true },
      }),
      this.db.productoVariante.findMany({
        where: { producto: { tenantId }, inventarioActivado: false },
        select: { id: true, productoId: true },
      }),
    ])

    let productosInicializados = 0
    let variantesInicializadas = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      for (const p of productos) {
        await tx.producto.update({
          where: { id: p.id },
          data: { inventarioActivado: true, cantidadStock: 0 },
        })
        await tx.movimientoInventario.upsert({
          where: {
            tenantId_productoId_varianteId_tipo_referenciaId: {
              tenantId,
              productoId: p.id,
              varianteId: null,
              tipo: "CREACION",
              referenciaId: `init-${p.id}`,
            },
          },
          create: {
            tenantId,
            productoId: p.id,
            varianteId: null,
            tipo: "CREACION",
            cantidad: 0,
            motivo: "Inicialización de inventario",
            referenciaId: `init-${p.id}`,
            stockAntes: 0,
            stockDespues: 0,
            createdById: createdById ?? null,
          },
          update: {},
        })
        productosInicializados++
      }

      for (const v of variantes) {
        await tx.productoVariante.update({
          where: { id: v.id },
          data: { inventarioActivado: true, cantidadStock: 0 },
        })
        await tx.movimientoInventario.upsert({
          where: {
            tenantId_productoId_varianteId_tipo_referenciaId: {
              tenantId,
              productoId: v.productoId,
              varianteId: v.id,
              tipo: "CREACION",
              referenciaId: `init-${v.id}`,
            },
          },
          create: {
            tenantId,
            productoId: v.productoId,
            varianteId: v.id,
            tipo: "CREACION",
            cantidad: 0,
            motivo: "Inicialización de inventario",
            referenciaId: `init-${v.id}`,
            stockAntes: 0,
            stockDespues: 0,
            createdById: createdById ?? null,
          },
          update: {},
        })
        variantesInicializadas++
      }
    })

    return { productosInicializados, variantesInicializadas }
  }

  async inicializarProductoIndividual(
    tenantId: string,
    productoId: string,
    varianteId?: string,
    createdById?: string
  ): Promise<void> {
    if (varianteId) {
      const v = await this.db.productoVariante.findFirst({
        where: { id: varianteId, producto: { tenantId }, inventarioActivado: false },
      })
      if (!v) return
      await this.db.$transaction([
        this.db.productoVariante.update({
          where: { id: varianteId },
          data: { inventarioActivado: true, cantidadStock: 0 },
        }),
        this.db.movimientoInventario.upsert({
          where: {
            tenantId_productoId_varianteId_tipo_referenciaId: {
              tenantId,
              productoId,
              varianteId,
              tipo: "CREACION",
              referenciaId: `init-${varianteId}`,
            },
          },
          create: {
            tenantId,
            productoId,
            varianteId,
            tipo: "CREACION",
            cantidad: 0,
            motivo: "Inicialización de inventario",
            referenciaId: `init-${varianteId}`,
            stockAntes: 0,
            stockDespues: 0,
            createdById: createdById ?? null,
          },
          update: {},
        }),
      ])
    } else {
      const p = await this.db.producto.findFirst({
        where: { id: productoId, tenantId, inventarioActivado: false },
      })
      if (!p) return
      await this.db.$transaction([
        this.db.producto.update({
          where: { id: productoId },
          data: { inventarioActivado: true, cantidadStock: 0 },
        }),
        this.db.movimientoInventario.upsert({
          where: {
            tenantId_productoId_varianteId_tipo_referenciaId: {
              tenantId,
              productoId,
              varianteId: null,
              tipo: "CREACION",
              referenciaId: `init-${productoId}`,
            },
          },
          create: {
            tenantId,
            productoId,
            varianteId: null,
            tipo: "CREACION",
            cantidad: 0,
            motivo: "Inicialización de inventario",
            referenciaId: `init-${productoId}`,
            stockAntes: 0,
            stockDespues: 0,
            createdById: createdById ?? null,
          },
          update: {},
        }),
      ])
    }
  }

  // ─── Movimiento de salida idempotente para ventas ─────────────────────────────

  async registrarMovimientoSalidaIdempotente(
    tenantId: string,
    ventaId: string,
    detalles: MovimientoSalidaDetalle[],
    createdById?: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      for (const d of detalles) {
        const varianteData = d.varianteId
          ? await tx.productoVariante.findFirst({ where: { id: d.varianteId }, select: { cantidadStock: true } })
          : await tx.producto.findFirst({ where: { id: d.productoId }, select: { cantidadStock: true } })

        const stockAntes = Number(varianteData?.cantidadStock ?? 0)
        const stockDespues = stockAntes - d.cantidad

        await tx.movimientoInventario.upsert({
          where: {
            tenantId_productoId_varianteId_tipo_referenciaId: {
              tenantId,
              productoId: d.productoId,
              varianteId: d.varianteId ?? null,
              tipo: "SALIDA",
              referenciaId: ventaId,
            },
          },
          create: {
            tenantId,
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            tipo: "SALIDA",
            cantidad: -d.cantidad,
            motivo: "Venta",
            referenciaId: ventaId,
            stockAntes,
            stockDespues,
            createdById: createdById ?? null,
          },
          update: {
            cantidad: -d.cantidad,
            stockAntes,
            stockDespues,
          },
        })

        if (d.varianteId) {
          await tx.productoVariante.update({
            where: { id: d.varianteId },
            data: { cantidadStock: { decrement: d.cantidad } },
          })
          await this.recalcularStockPadre(tx, d.productoId)
        } else {
          await tx.producto.update({
            where: { id: d.productoId },
            data: { cantidadStock: { decrement: d.cantidad } },
          })
        }
      }
    })
  }

  // ─── Listados ────────────────────────────────────────────────────────────────

  async listarAjustes(tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["motivo"])
    const where = { tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.ajusteInventario.findMany({
        where,
        take,
        skip,
        orderBy,
        include: { detalles: true },
      }),
      this.db.ajusteInventario.count({ where }),
    ])
    return { data, total }
  }

  async listarRecuentos(tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["observacion"])
    const where = { tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.recuentoInventario.findMany({
        where,
        take,
        skip,
        orderBy,
        include: { detalles: true },
      }),
      this.db.recuentoInventario.count({ where }),
    ])
    return { data, total }
  }

  async listarMovimientos(varianteId: string, tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["motivo"])
    const where = { varianteId, tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.movimientoInventario.findMany({ where, take, skip, orderBy }),
      this.db.movimientoInventario.count({ where }),
    ])
    return { data, total }
  }

  // ─── Mappers privados ────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapAjuste(raw: any): AjusteDoc {
    return {
      id: raw.id,
      tenantId: raw.tenantId,
      estado: raw.estado,
      motivo: raw.motivo,
      version: raw.version,
      detalles: raw.detalles.map((d: any) => ({
        productoId: d.productoId,
        varianteId: d.varianteId,
        cantidadAjuste: d.cantidadAjuste,
        stockAnterior: d.stockAnterior,
        stockDespues: d.stockDespues,
      })),
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRecuento(raw: any): RecuentoDoc {
    return {
      id: raw.id,
      tenantId: raw.tenantId,
      estado: raw.estado,
      observacion: raw.observacion,
      version: raw.version,
      detalles: raw.detalles.map((d: any) => ({
        productoId: d.productoId,
        varianteId: d.varianteId,
        stockSistema: Number(d.stockSistema),
        stockFisico: Number(d.stockFisico),
        diferencia: Number(d.diferencia),
      })),
    }
  }
}
