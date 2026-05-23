import type {
  ISalidaAlmacenRepository,
  CrearSalidaDTO,
  SalidaResultado,
} from "../domain/ports/ISalidaAlmacenRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

export class SalidaAlmacenPrismaRepository implements ISalidaAlmacenRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async create(dto: CrearSalidaDTO): Promise<SalidaResultado> {
    const detallesResult: SalidaResultado["detalles"] = []

    const insumos = await Promise.all(
      dto.detalles.map((d) =>
        this.db.insumo.findFirst({ where: { id: d.insumoId, tenantId: dto.tenantId } })
      )
    )

    await this.db.$transaction(async (tx: any) => {
      const salida = await tx.salidaAlmacen.create({
        data: {
          tenantId: dto.tenantId,
          descripcion: dto.descripcion ?? null,
          tenantMemberId: dto.tenantMemberId ?? null,
          createdById: dto.createdById ?? null,
          estado: "ACTIVO",
        },
      })

      for (let i = 0; i < dto.detalles.length; i++) {
        const d = dto.detalles[i]
        const ins = insumos[i]
        const stockAntes = Number(ins.cantidadStock)
        const stockDespues = stockAntes - d.cantidad

        await tx.salidaDetalle.create({
          data: {
            salidaId: salida.id,
            insumoId: d.insumoId,
            cantidad: d.cantidad,
          },
        })

        await tx.movimientoAlmacen.create({
          data: {
            tenantId: dto.tenantId,
            insumoId: d.insumoId,
            tipo: "SALIDA",
            cantidad: d.cantidad,
            motivo: dto.descripcion ?? null,
            referenciaId: salida.id,
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

    return { salidaId: "committed", detalles: detallesResult }
  }

  async findById(id: string, tenantId: string) {
    return this.db.salidaAlmacen.findFirst({
      where: { id, tenantId },
      include: { detalles: true },
    })
  }

  async listar(tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["descripcion"])
    const where = { tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.salidaAlmacen.findMany({ where, take, skip, orderBy, include: { detalles: true } }),
      this.db.salidaAlmacen.count({ where }),
    ])
    return { data, total }
  }
}
