import type {
  IIngresoAlmacenRepository,
  CrearIngresoDTO,
  IngresoResultado,
} from "../domain/ports/IIngresoAlmacenRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

export class IngresoAlmacenPrismaRepository implements IIngresoAlmacenRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async create(dto: CrearIngresoDTO): Promise<IngresoResultado> {
    const detallesResult: IngresoResultado["detalles"] = []

    // Cargar stocks actuales antes de la transacción
    const insumos = await Promise.all(
      dto.detalles.map((d) =>
        this.db.insumo.findFirst({ where: { id: d.insumoId, tenantId: dto.tenantId } })
      )
    )

    await this.db.$transaction(async (tx: any) => {
      const ingreso = await tx.ingresoAlmacen.create({
        data: {
          tenantId: dto.tenantId,
          proveedorId: dto.proveedorId,
          descripcion: dto.descripcion ?? null,
          tenantMemberId: dto.tenantMemberId ?? null,
          createdById: dto.createdById ?? null,
          totalCantidad: dto.detalles.reduce((s, d) => s + d.cantidad, 0),
          totalIngreso: dto.detalles.reduce((s, d) => s + (d.cantidad * (d.costoUnitario ?? 0)), 0),
          estado: "ACTIVO",
        },
      })

      for (let i = 0; i < dto.detalles.length; i++) {
        const d = dto.detalles[i]
        const ins = insumos[i]
        const stockAntes = Number(ins.cantidadStock)
        const stockDespues = stockAntes + d.cantidad

        await tx.ingresoDetalle.create({
          data: {
            ingresoId: ingreso.id,
            insumoId: d.insumoId,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario ?? 0,
            costoTotal: d.cantidad * (d.costoUnitario ?? 0),
            lote: d.lote ?? null,
            fechaVencimiento: d.fechaVencimiento ?? null,
            observaciones: d.observaciones ?? null,
          },
        })

        await tx.movimientoAlmacen.create({
          data: {
            tenantId: dto.tenantId,
            insumoId: d.insumoId,
            tipo: "INGRESO",
            cantidad: d.cantidad,
            motivo: dto.descripcion ?? null,
            referenciaId: ingreso.id,
            stockAntes,
            stockDespues,
            createdById: dto.createdById ?? null,
          },
        })

        await tx.insumo.update({
          where: { id: d.insumoId },
          data: { cantidadStock: stockDespues },
        })

        detallesResult.push({
          insumoId: d.insumoId,
          insumoNombre: ins.nombre as string,
          cantidad: d.cantidad,
          stockAntes,
          stockDespues,
          stockMinimo: ins.stockMinimo as number,
        })
      }
    })

    return { ingresoId: "committed", detalles: detallesResult }
  }

  async findById(id: string, tenantId: string) {
    return this.db.ingresoAlmacen.findFirst({
      where: { id, tenantId },
      include: { detalles: true, proveedor: true },
    })
  }

  async listar(tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["descripcion"])
    const where = { tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.ingresoAlmacen.findMany({ where, take, skip, orderBy, include: { detalles: true } }),
      this.db.ingresoAlmacen.count({ where }),
    ])
    return { data, total }
  }
}
