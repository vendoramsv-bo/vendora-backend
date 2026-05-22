import type { IMedicoRepository, ListResult, MedicoCreateDTO, HorarioCreateDTO } from "../domain/ports/IMedicoRepository.js"
import { MedicoEntity, type MedicoRaw, type HorarioAtencionRaw } from "../domain/medico.entity.js"
import { MedicoNoEncontrado, HorarioDuplicado } from "../domain/consultorio.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { withAudit } from "../../../core/prisma-scoped.js"

export class MedicoPrismaRepository implements IMedicoRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async crear(data: MedicoCreateDTO, userId: string): Promise<MedicoEntity> {
    const raw = await this.client.medico.create({
      data: withAudit({ ...data }, userId),
      include: { horariosAtencion: true },
    })
    return MedicoEntity.fromPrisma(raw as MedicoRaw)
  }

  async obtener(id: string, consultorioId: string): Promise<MedicoEntity> {
    const raw = await this.client.medico.findFirst({
      where: { id, consultorioId },
      include: { horariosAtencion: true },
    })
    if (!raw) throw new MedicoNoEncontrado(id)
    return MedicoEntity.fromPrisma(raw as MedicoRaw)
  }

  async listar(consultorioId: string, params: QueryParams): Promise<ListResult<MedicoEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["especialidad"])
    const where = { consultorioId, ...whereSearch }
    const [items, total] = await Promise.all([
      this.client.medico.findMany({ where, take, skip, orderBy, include: { horariosAtencion: true } }),
      this.client.medico.count({ where }),
    ])
    return { data: items.map((r: MedicoRaw) => MedicoEntity.fromPrisma(r)), total }
  }

  async actualizar(id: string, data: Partial<MedicoRaw>, userId: string): Promise<MedicoEntity> {
    const raw = await this.client.medico.update({
      where: { id },
      data: { ...data, updatedById: userId },
      include: { horariosAtencion: true },
    })
    return MedicoEntity.fromPrisma(raw as MedicoRaw)
  }

  async buscarPorMiembro(memberId: string, consultorioId: string): Promise<MedicoEntity | null> {
    const raw = await this.client.medico.findFirst({ where: { memberId, consultorioId } })
    if (!raw) return null
    return MedicoEntity.fromPrisma(raw as MedicoRaw)
  }

  async agregarHorario(medicoId: string, data: HorarioCreateDTO): Promise<HorarioAtencionRaw> {
    try {
      return await this.client.horarioAtencion.create({ data: { medicoId, ...data } })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Unique constraint") || msg.includes("unique")) throw new HorarioDuplicado()
      throw err
    }
  }

  async eliminarHorario(horarioId: string, medicoId: string): Promise<void> {
    await this.client.horarioAtencion.deleteMany({ where: { id: horarioId, medicoId } })
  }

  async listarHorarios(medicoId: string): Promise<HorarioAtencionRaw[]> {
    return this.client.horarioAtencion.findMany({ where: { medicoId } })
  }

  async tieneCitasPendientes(id: string): Promise<boolean> {
    const count = await this.client.cita.count({
      where: { medicoId: id, estado: { in: ["PENDIENTE", "ACEPTADO"] } },
    })
    return count > 0
  }
}
