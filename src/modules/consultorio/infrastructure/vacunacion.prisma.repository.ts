import type { IVacunacionRepository, VacunacionCreateDTO } from "../domain/ports/IVacunacionRepository.js"
import { VacunacionEntity, type VacunacionRaw } from "../domain/vacunacion.entity.js"
import { VacunacionNoEncontrada } from "../domain/consultorio.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

export class VacunacionPrismaRepository implements IVacunacionRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async crear(pacienteId: string, data: VacunacionCreateDTO): Promise<VacunacionEntity> {
    const raw = await this.client.vacunacion.create({
      data: {
        pacienteId,
        vacuna: data.vacuna,
        dosis: data.dosis ?? null,
        fechaAplicacion: data.fechaAplicacion ?? new Date(),
        proximaDosis: data.proximaDosis ?? null,
        medicoId: data.medicoId ?? null,
        lote: data.lote ?? null,
      },
    })
    return VacunacionEntity.fromPrisma(raw as VacunacionRaw)
  }

  async listar(pacienteId: string, params: QueryParams): Promise<VacunacionEntity[]> {
    const { take, skip, orderBy } = toPrismaArgs(params, ["vacuna"])
    const items = await this.client.vacunacion.findMany({
      where: { pacienteId },
      take,
      skip,
      orderBy: orderBy ?? { fechaAplicacion: "desc" },
    })
    return items.map((r: VacunacionRaw) => VacunacionEntity.fromPrisma(r))
  }

  async obtenerPorId(id: string): Promise<VacunacionEntity | null> {
    const raw = await this.client.vacunacion.findUnique({ where: { id } })
    if (!raw) return null
    return VacunacionEntity.fromPrisma(raw as VacunacionRaw)
  }

  async eliminar(id: string, pacienteId: string): Promise<void> {
    const vac = await this.obtenerPorId(id)
    if (!vac || vac.pacienteId !== pacienteId) throw new VacunacionNoEncontrada(id)
    await this.client.vacunacion.delete({ where: { id } })
  }
}
