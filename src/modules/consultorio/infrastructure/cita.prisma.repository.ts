import type { ICitaRepository, CitaCreateDTO } from "../domain/ports/ICitaRepository.js"
import type { ListResult } from "../domain/ports/IMedicoRepository.js"
import { CitaEntity, type CitaRaw } from "../domain/cita.entity.js"
import { CitaNoEncontrada } from "../domain/consultorio.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { withAudit } from "../../../core/prisma-scoped.js"

// ±4h window to limit DB scan before in-memory exact overlap check
const MAX_DURACION_MS = 4 * 60 * 60_000

export class CitaPrismaRepository implements ICitaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async crear(data: CitaCreateDTO, consultorioId: string, userId: string): Promise<CitaEntity> {
    const raw = await this.client.cita.create({
      data: withAudit({ consultorioId, duracionMin: 30, ...data }, userId),
    })
    return CitaEntity.fromPrisma(raw as CitaRaw)
  }

  async obtener(id: string, consultorioId: string): Promise<CitaEntity> {
    const raw = await this.client.cita.findFirst({ where: { id, consultorioId } })
    if (!raw) throw new CitaNoEncontrada(id)
    return CitaEntity.fromPrisma(raw as CitaRaw)
  }

  async listar(consultorioId: string, params: QueryParams): Promise<ListResult<CitaEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["motivo"])
    const where = { consultorioId, ...whereSearch }
    const [items, total] = await Promise.all([
      this.client.cita.findMany({ where, take, skip, orderBy }),
      this.client.cita.count({ where }),
    ])
    return { data: items.map((r: CitaRaw) => CitaEntity.fromPrisma(r)), total }
  }

  async listarPorMedico(medicoId: string, consultorioId: string, params: QueryParams): Promise<ListResult<CitaEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["motivo"])
    const where = { consultorioId, medicoId, ...whereSearch }
    const [items, total] = await Promise.all([
      this.client.cita.findMany({ where, take, skip, orderBy }),
      this.client.cita.count({ where }),
    ])
    return { data: items.map((r: CitaRaw) => CitaEntity.fromPrisma(r)), total }
  }

  async cambiarEstado(id: string, estado: string, userId: string): Promise<CitaEntity> {
    const raw = await this.client.cita.update({
      where: { id },
      data: { estado, updatedById: userId },
    })
    return CitaEntity.fromPrisma(raw as CitaRaw)
  }

  async verificarSolapamiento(
    consultorioId: string,
    medicoId: string,
    fechaHora: Date,
    duracionMin: number,
    excluirId?: string,
  ): Promise<boolean> {
    const fin = new Date(fechaHora.getTime() + duracionMin * 60_000)
    const where: Record<string, unknown> = {
      consultorioId,
      medicoId,
      // CANCELADA→ELIMINADO, NO_ASISTIO→RECHAZADO
      estado: { notIn: ["ELIMINADO", "RECHAZADO"] },
      fechaHora: {
        gte: new Date(fechaHora.getTime() - MAX_DURACION_MS),
        lt: fin,
      },
    }
    if (excluirId) where["id"] = { not: excluirId }

    const candidatas = await this.client.cita.findMany({
      where,
      select: { fechaHora: true, duracionMin: true },
    })

    return candidatas.some((c: { fechaHora: Date; duracionMin: number }) => {
      const cFin = new Date(c.fechaHora.getTime() + c.duracionMin * 60_000)
      return fechaHora < cFin && fin > c.fechaHora
    })
  }
}
