import type { ICitaRepository } from "../../domain/ports/ICitaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { CitaEntity } from "../../domain/cita.entity.js"
import { CitaYaAtendida, ConflictoVersionError } from "../../domain/consultorio.errors.js"

export class CancelarCitaUseCase {
  constructor(
    private readonly repo: ICitaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(id: string, consultorioId: string, userId: string, tenantId: string, expectedUpdatedAt?: Date): Promise<CitaEntity> {
    const cita = await this.repo.obtener(id, consultorioId)
    if (cita.estaTerminada()) throw new CitaYaAtendida()

    if (expectedUpdatedAt !== undefined && cita.updatedAt !== null) {
      if (expectedUpdatedAt.getTime() !== cita.updatedAt.getTime()) throw new ConflictoVersionError()
    }

    const estadoAnterior = cita.estado
    const actualizada = await this.repo.cambiarEstado(id, "ELIMINADO", userId)

    this.notificador.citaCambiada(tenantId, {
      citaId: cita.id,
      medicoId: cita.medicoId,
      pacienteId: cita.pacienteId,
      estadoAnterior,
      estadoNuevo: "ELIMINADO",
      tenantId,
    })

    return actualizada
  }
}
