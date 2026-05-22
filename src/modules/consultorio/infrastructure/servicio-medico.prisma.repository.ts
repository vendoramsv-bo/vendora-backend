import type { IServicioMedicoRepository, ServicioCreateDTO } from "../domain/ports/IServicioMedicoRepository.js"
import type { ListResult } from "../domain/ports/IMedicoRepository.js"
import { ServicioMedicoEntity, type ServicioMedicoRaw } from "../domain/servicio-medico.entity.js"
import { ServicioNoEncontrado, ServicioNombreDuplicado } from "../domain/consultorio.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { withAudit } from "../../../core/prisma-scoped.js"

export class ServicioMedicoPrismaRepository implements IServicioMedicoRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async crear(data: ServicioCreateDTO, consultorioId: string, userId: string): Promise<ServicioMedicoEntity> {
    try {
      const raw = await this.client.servicioMedico.create({
        data: withAudit({ consultorioId, duracionMin: 30, precioBase: 0, ...data }, userId),
      })
      return ServicioMedicoEntity.fromPrisma(raw as ServicioMedicoRaw)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Unique constraint") || msg.includes("unique")) throw new ServicioNombreDuplicado()
      throw err
    }
  }

  async obtener(id: string, consultorioId: string): Promise<ServicioMedicoEntity> {
    const raw = await this.client.servicioMedico.findFirst({ where: { id, consultorioId } })
    if (!raw) throw new ServicioNoEncontrado(id)
    return ServicioMedicoEntity.fromPrisma(raw as ServicioMedicoRaw)
  }

  async listar(consultorioId: string, params: QueryParams): Promise<ListResult<ServicioMedicoEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["nombre"])
    const where = { consultorioId, ...whereSearch }
    const [items, total] = await Promise.all([
      this.client.servicioMedico.findMany({ where, take, skip, orderBy }),
      this.client.servicioMedico.count({ where }),
    ])
    return { data: items.map((r: ServicioMedicoRaw) => ServicioMedicoEntity.fromPrisma(r)), total }
  }

  async actualizar(id: string, data: Partial<ServicioCreateDTO & { estado: string }>, userId: string): Promise<ServicioMedicoEntity> {
    const raw = await this.client.servicioMedico.update({
      where: { id },
      data: { ...data, updatedById: userId },
    })
    return ServicioMedicoEntity.fromPrisma(raw as ServicioMedicoRaw)
  }

  async tieneUsoActivo(id: string): Promise<boolean> {
    const [citas, detalles] = await Promise.all([
      this.client.cita.count({ where: { servicioId: id, estado: { notIn: ["ELIMINADO", "RECHAZADO"] } } }),
      this.client.atencionDetalle.count({ where: { servicioId: id } }),
    ])
    return citas > 0 || detalles > 0
  }
}
