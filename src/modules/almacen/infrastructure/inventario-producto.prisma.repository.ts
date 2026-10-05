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
import { argsListadoMovimientos, TIPOS_MOVIMIENTO_INVENTARIO } from "./movimiento-prisma-args.js"
import { registrarMovimiento } from "./movimiento-inventario.writer.js"
import {
  ConflictoVersionError,
  DocumentoNoEncontradoError,
  DocumentoYaAprobadoError,
  StockNegativoError,
} from "../domain/almacen.errors.js"

const MOTIVO_INICIALIZACION = "Inicialización de inventario"

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

  // Fija el stock de la variante (y recalcula el padre) o del producto simple.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fijarStock(tx: any, tenantId: string, productoId: string, varianteId: string | null, stock: number): Promise<void> {
    if (varianteId) {
      await tx.productoVariante.update({
        where: { id: varianteId, producto: { tenantId } },
        data: { cantidadStock: stock },
      })
      await this.recalcularStockPadre(tx, productoId)
    } else {
      await tx.producto.update({
        where: { id: productoId, tenantId },
        data: { cantidadStock: stock },
      })
    }
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
      if (!v) throw new DocumentoNoEncontradoError(d.varianteId ? "VARIANTE" : "PRODUCTO", d.varianteId ?? d.productoId)
      const stockActual = Number(v.cantidadStock ?? 0)
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

        const { insertado } = await registrarMovimiento(tx, {
          tenantId: dto.tenantId,
          productoId: d.productoId,
          varianteId: d.varianteId ?? null,
          tipo: "AJUSTE",
          stockAntes,
          stockDespues,
          motivo: ajuste.motivo ?? null,
          referenciaId: dto.ajusteId,
          createdById: dto.aprobadoPorId ?? null,
        })
        if (insertado) await this.fijarStock(tx, dto.tenantId, d.productoId, d.varianteId ?? null, stockDespues)

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
      if (!variantesActuales[i]) {
        throw new DocumentoNoEncontradoError(d.varianteId ? "VARIANTE" : "PRODUCTO", d.varianteId ?? d.productoId)
      }
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
        const diferencia = stockDespues - stockAntes

        const { insertado } = await registrarMovimiento(tx, {
          tenantId: dto.tenantId,
          productoId: d.productoId,
          varianteId: d.varianteId ?? null,
          tipo: "RECUENTO",
          stockAntes,
          stockDespues,
          motivo: recuento.observacion ?? null,
          referenciaId: dto.recuentoId,
          createdById: dto.aprobadoPorId ?? null,
        })
        if (insertado) await this.fijarStock(tx, dto.tenantId, d.productoId, d.varianteId ?? null, stockDespues)

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
  //
  // Producto sin variantes: "inicializado" = tiene su CREACION (`init-<productoId>`).
  // Se registra con el stock actual y NO se toca `cantidadStock` (spec 027).
  // Producto con variantes: el padre no se inicializa; su stock es la suma de las variantes.
  // Variante: si `inventarioActivado = false`, se activa con stock 0 y su CREACION.

  async inicializarStockBulk(tenantId: string, createdById?: string): Promise<InicializarBulkResultado> {
    const [productos, variantes] = await Promise.all([
      this.db.producto.findMany({
        where: { tenantId, variantes: { none: {} } },
        select: { id: true, cantidadStock: true },
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
        const stock = Number(p.cantidadStock ?? 0)
        const { insertado } = await registrarMovimiento(tx, {
          tenantId,
          productoId: p.id,
          varianteId: null,
          tipo: "CREACION",
          stockAntes: stock,
          stockDespues: stock,
          motivo: MOTIVO_INICIALIZACION,
          referenciaId: `init-${p.id}`,
          createdById: createdById ?? null,
        })
        if (insertado) productosInicializados++
      }

      for (const v of variantes) {
        if (await this.inicializarVariante(tx, tenantId, v.productoId, v.id, createdById)) variantesInicializadas++
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
        where: { id: varianteId, productoId, producto: { tenantId }, inventarioActivado: false },
        select: { id: true },
      })
      if (!v) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.db.$transaction(async (tx: any) => {
        await this.inicializarVariante(tx, tenantId, productoId, varianteId, createdById)
      })
      return
    }

    const p = await this.db.producto.findFirst({
      where: { id: productoId, tenantId, variantes: { none: {} } },
      select: { id: true, cantidadStock: true },
    })
    if (!p) return
    const stock = Number(p.cantidadStock ?? 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      await registrarMovimiento(tx, {
        tenantId,
        productoId,
        varianteId: null,
        tipo: "CREACION",
        stockAntes: stock,
        stockDespues: stock,
        motivo: MOTIVO_INICIALIZACION,
        referenciaId: `init-${productoId}`,
        createdById: createdById ?? null,
      })
    })
  }

  // Activa la variante con stock 0 y registra su CREACION. Devuelve si se inicializó.
  private async inicializarVariante(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    tenantId: string,
    productoId: string,
    varianteId: string,
    createdById?: string
  ): Promise<boolean> {
    const { insertado } = await registrarMovimiento(tx, {
      tenantId,
      productoId,
      varianteId,
      tipo: "CREACION",
      stockAntes: 0,
      stockDespues: 0,
      motivo: MOTIVO_INICIALIZACION,
      referenciaId: `init-${varianteId}`,
      createdById: createdById ?? null,
    })
    await tx.productoVariante.update({
      where: { id: varianteId },
      data: insertado ? { inventarioActivado: true, cantidadStock: 0 } : { inventarioActivado: true },
    })
    if (insertado) await this.recalcularStockPadre(tx, productoId)
    return insertado
  }

  // ─── Movimiento de salida idempotente para ventas ─────────────────────────────
  //
  // Por línea: lee el stock con FOR UPDATE (stockAntes correcto con ventas
  // concurrentes), registra la SALIDA y solo si se insertó descuenta el stock.
  // Un reintento de la misma venta no descuenta dos veces.

  async registrarMovimientoSalidaIdempotente(
    tenantId: string,
    ventaId: string,
    detalles: MovimientoSalidaDetalle[],
    createdById?: string
  ): Promise<void> {
    // Líneas repetidas del mismo producto/variante se descuentan como una sola SALIDA
    const agrupados = new Map<string, MovimientoSalidaDetalle>()
    for (const d of detalles) {
      const clave = `${d.productoId}:${d.varianteId ?? ""}`
      const previo = agrupados.get(clave)
      agrupados.set(clave, previo ? { ...previo, cantidad: previo.cantidad + d.cantidad } : { ...d })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      for (const d of agrupados.values()) {
        const filas: { cantidadStock: number }[] = d.varianteId
          ? await tx.$queryRaw`
              SELECT v."cantidadStock" FROM "catalogo"."ProductoVariante" v
              JOIN "catalogo"."Producto" p ON p.id = v."productoId"
              WHERE v.id = ${d.varianteId} AND v."productoId" = ${d.productoId} AND p."tenantId" = ${tenantId}
              FOR UPDATE OF v`
          : await tx.$queryRaw`
              SELECT "cantidadStock" FROM "catalogo"."Producto"
              WHERE id = ${d.productoId} AND "tenantId" = ${tenantId}
              FOR UPDATE`
        if (filas.length === 0) {
          throw new Error(
            `Salida de venta ${ventaId}: no existe ${d.varianteId ? `la variante ${d.varianteId}` : "el producto"} ` +
              `(producto ${d.productoId}) en el tenant ${tenantId}`
          )
        }

        const stockAntes = Number(filas[0].cantidadStock)
        const { insertado } = await registrarMovimiento(tx, {
          tenantId,
          productoId: d.productoId,
          varianteId: d.varianteId ?? null,
          tipo: "SALIDA",
          stockAntes,
          stockDespues: stockAntes - d.cantidad,
          motivo: "Venta",
          referenciaId: ventaId,
          createdById: createdById ?? null,
        })
        if (!insertado) continue

        if (d.varianteId) {
          await tx.productoVariante.update({
            where: { id: d.varianteId },
            data: { cantidadStock: { decrement: d.cantidad } },
          })
          await this.recalcularStockPadre(tx, d.productoId)
        } else {
          await tx.producto.update({
            where: { id: d.productoId, tenantId },
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
    const { take, skip, orderBy, where: whereSearch } = argsListadoMovimientos(params, TIPOS_MOVIMIENTO_INVENTARIO)
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
