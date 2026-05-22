import type { IPacienteRepository, PacienteCreateDTO, VacunacionDTO, Vacunacion } from "../domain/ports/IPacienteRepository.js"
import type { ListResult } from "../domain/ports/IMedicoRepository.js"
import { PacienteEntity, type PacienteRaw } from "../domain/paciente.entity.js"
import { PacienteNoEncontrado, PacienteEmailDuplicado } from "../domain/consultorio.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { withAudit } from "../../../core/prisma-scoped.js"

export class PacientePrismaRepository implements IPacienteRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async crear(data: PacienteCreateDTO, consultorioId: string, userId: string): Promise<PacienteEntity> {
    try {
      const fechaNacimiento = data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined
      const raw = await this.client.paciente.create({
        data: withAudit({ consultorioId, ...data, fechaNacimiento }, userId),
      })
      return PacienteEntity.fromPrisma(raw as PacienteRaw)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Unique constraint") || msg.includes("unique")) throw new PacienteEmailDuplicado()
      throw err
    }
  }

  async obtener(id: string, consultorioId: string): Promise<PacienteEntity> {
    const raw = await this.client.paciente.findFirst({ where: { id, consultorioId } })
    if (!raw) throw new PacienteNoEncontrado(id)
    return PacienteEntity.fromPrisma(raw as PacienteRaw)
  }

  async listar(consultorioId: string, params: QueryParams): Promise<ListResult<PacienteEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["nombre", "apellido"])
    const where = { consultorioId, ...whereSearch }
    const [items, total] = await Promise.all([
      this.client.paciente.findMany({ where, take, skip, orderBy }),
      this.client.paciente.count({ where }),
    ])
    return { data: items.map((r: PacienteRaw) => PacienteEntity.fromPrisma(r)), total }
  }

  async actualizar(id: string, data: Partial<PacienteRaw>, userId: string): Promise<PacienteEntity> {
    const raw = await this.client.paciente.update({
      where: { id },
      data: { ...data, updatedById: userId },
    })
    return PacienteEntity.fromPrisma(raw as PacienteRaw)
  }

  async registrarVacunacion(pacienteId: string, data: VacunacionDTO): Promise<Vacunacion> {
    return this.client.vacunacion.create({
      data: {
        pacienteId,
        vacuna: data.vacuna,
        dosis: data.dosis,
        fechaAplicacion: data.fechaAplicacion ? new Date(data.fechaAplicacion) : new Date(),
        proximaDosis: data.proximaDosis ? new Date(data.proximaDosis) : undefined,
        medicoId: data.medicoId,
        lote: data.lote,
      },
    })
  }

  async listarVacunaciones(pacienteId: string): Promise<Vacunacion[]> {
    return this.client.vacunacion.findMany({ where: { pacienteId }, orderBy: { fechaAplicacion: "desc" } })
  }
}
