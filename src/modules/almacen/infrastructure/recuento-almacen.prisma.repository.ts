import type {
  IRecuentoAlmacenRepository,
  RegistrarRecuentoAlmacenDTO,
  RecuentoAlmacenResultado,
} from "../domain/ports/IRecuentoAlmacenRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

export class RecuentoAlmacenPrismaRepository implements IRecuentoAlmacenRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async create(dto: RegistrarRecuentoAlmacenDTO): Promise<RecuentoAlmacenResultado> {
    const detallesResult: RecuentoAlmacenResultado["detalles"] = []

    const insumos = await Promise.all(
      dto.detalles.map((d) =>
        this.db.insumo.findFirst({ where: { id: d.insumoId, tenantId: dto.tenantId } })
      )
    )

    await this.db.$transaction(async (tx: any) => {
      const recuento = await tx.recuentoAlmacen.create({
        data: {
          tenantId: dto.tenantId,
          observacion: dto.observacion ?? null,
          tenantMemberId: dto.tenantMemberId ?? null,
          createdById: dto.createdById ?? null,
          estado: "ACTIVO",
        },
      })

      for (let i = 0; i < dto.detalles.length; i++) {
        const d = dto.detalles[i]
        const ins = insumos[i]
        const stockSistema = Number(ins.cantidadStock)
        const stockFisico = d.stockFisico
        const diferencia = stockFisico - stockSistema

        await tx.recuentoAlmacenDetalle.create({
          data: {
            recuentoId: recuento.id,
            insumoId: d.insumoId,
            stockSistema,
            stockFisico,
            diferencia,
          },
        })

        await tx.movimientoAlmacen.create({
          data: {
            tenantId: dto.tenantId,
            insumoId: d.insumoId,
            tipo: "RECUENTO",
            cantidad: diferencia,
            motivo: dto.observacion ?? null,
            referenciaId: recuento.id,
            stockAntes: stockSistema,
            stockDespues: stockFisico,
            createdById: dto.createdById ?? null,
          },
        })

        await tx.insumo.update({
          where: { id: d.insumoId },
          data: { cantidadStock: stockFisico },
        })

        detallesResult.push({
          insumoId: d.insumoId,
          insumoNombre: ins.nombre as string,
          stockSistema,
          stockFisico,
          diferencia,
          stockMinimo: ins.stockMinimo as number,
        })
      }
    })

    return { recuentoId: "committed", detalles: detallesResult }
  }

  async findById(id: string, tenantId: string) {
    return this.db.recuentoAlmacen.findFirst({
      where: { id, tenantId },
      include: { recuentosAlmacenDetalle: true },
    })
  }

  async listar(tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["observacion"])
    const where = { tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.recuentoAlmacen.findMany({ where, take, skip, orderBy, include: { recuentosAlmacenDetalle: true } }),
      this.db.recuentoAlmacen.count({ where }),
    ])
    return { data, total }
  }
}
