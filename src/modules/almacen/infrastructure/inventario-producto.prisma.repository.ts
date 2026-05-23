import type {
  IInventarioProductoRepository,
  VarianteStockData,
  RegistrarAjusteDTO,
  RegistrarRecuentoDTO,
  AjusteResultado,
  RecuentoResultado,
} from "../domain/ports/IInventarioProductoRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

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

  async registrarAjuste(dto: RegistrarAjusteDTO): Promise<AjusteResultado> {
    // Cargar datos actuales de todas las variantes antes de la transacción
    const variantesActuales = await Promise.all(
      dto.detalles.map((d) =>
        this.db.productoVariante.findFirst({
          where: { id: d.varianteId, producto: { tenantId: dto.tenantId } },
          include: { producto: { select: { nombre: true } } },
        })
      )
    )

    const detallesResult: AjusteResultado["detalles"] = []

    await this.db.$transaction(async (tx: any) => {
      const ajuste = await tx.ajusteInventario.create({
        data: {
          tenantId: dto.tenantId,
          motivo: dto.motivo,
          estado: "ACTIVO",
          tenantMemberId: dto.tenantMemberId ?? null,
          createdById: dto.createdById ?? null,
        },
      })

      for (let i = 0; i < dto.detalles.length; i++) {
        const d = dto.detalles[i]
        const v = variantesActuales[i]
        const stockAntes = v.cantidadStock as number
        const stockDespues = stockAntes + d.cantidadAjuste

        await tx.ajusteDetalle.create({
          data: {
            ajusteId: ajuste.id,
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            stockAnterior: stockAntes,
            cantidadAjuste: d.cantidadAjuste,
            stockDespues,
          },
        })

        await tx.movimientoInventario.create({
          data: {
            tenantId: dto.tenantId,
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            tipo: "AJUSTE",
            cantidad: d.cantidadAjuste,
            motivo: dto.motivo ?? null,
            referenciaId: ajuste.id,
            stockAntes,
            stockDespues,
            createdById: dto.createdById ?? null,
          },
        })

        await tx.productoVariante.update({
          where: { id: d.varianteId },
          data: { cantidadStock: stockDespues },
        })

        detallesResult.push({
          varianteId: v.id,
          stockAntes,
          stockDespues,
          stockMinimo: v.stockMinimo as number,
          productoId: d.productoId,
          productoNombre: v.producto.nombre as string,
          sku: v.sku as string | null,
        })
      }
    })

    return { ajusteId: "committed", detalles: detallesResult }
  }

  async registrarRecuento(dto: RegistrarRecuentoDTO): Promise<RecuentoResultado> {
    const variantesActuales = await Promise.all(
      dto.detalles.map((d) =>
        this.db.productoVariante.findFirst({
          where: { id: d.varianteId, producto: { tenantId: dto.tenantId } },
          include: { producto: { select: { nombre: true } } },
        })
      )
    )

    const detallesResult: RecuentoResultado["detalles"] = []

    await this.db.$transaction(async (tx: any) => {
      const recuento = await tx.recuentoInventario.create({
        data: {
          tenantId: dto.tenantId,
          observacion: dto.observacion ?? null,
          estado: "ACTIVO",
          tenantMemberId: dto.tenantMemberId ?? null,
          createdById: dto.createdById ?? null,
        },
      })

      for (let i = 0; i < dto.detalles.length; i++) {
        const d = dto.detalles[i]
        const v = variantesActuales[i]
        const stockSistema = v.cantidadStock as number
        const stockFisico = d.stockFisico
        const diferencia = stockFisico - stockSistema

        await tx.recuentoDetalle.create({
          data: {
            recuentoId: recuento.id,
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            stockSistema,
            stockFisico,
            diferencia,
          },
        })

        await tx.movimientoInventario.create({
          data: {
            tenantId: dto.tenantId,
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            tipo: "RECUENTO",
            cantidad: diferencia,
            motivo: dto.observacion ?? null,
            referenciaId: recuento.id,
            stockAntes: stockSistema,
            stockDespues: stockFisico,
            createdById: dto.createdById ?? null,
          },
        })

        await tx.productoVariante.update({
          where: { id: d.varianteId },
          data: { cantidadStock: stockFisico },
        })

        detallesResult.push({
          varianteId: v.id,
          stockAntes: stockSistema,
          stockDespues: stockFisico,
          stockMinimo: v.stockMinimo as number,
          productoId: d.productoId,
          productoNombre: v.producto.nombre as string,
          sku: v.sku as string | null,
          diferencia,
        })
      }
    })

    return { recuentoId: "committed", detalles: detallesResult }
  }

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
}
