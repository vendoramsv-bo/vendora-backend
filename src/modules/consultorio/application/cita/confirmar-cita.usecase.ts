import type { ICitaRepository } from "../../domain/ports/ICitaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { CitaEntity } from "../../domain/cita.entity.js"
import { CitaNoConfirmable } from "../../domain/consultorio.errors.js"

export class ConfirmarCitaUseCase {
  constructor(
    private readonly repo: ICitaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(id: string, consultorioId: string, userId: string, tenantId: string): Promise<CitaEntity> {
    const cita = await this.repo.obtener(id, consultorioId)
    if (!cita.puedeConfirmarse()) throw new CitaNoConfirmable()

    const estadoAnterior = cita.estado
    const actualizada = await this.repo.cambiarEstado(id, "ACEPTADO", userId)

    this.notificador.citaCambiada(tenantId, {
      citaId: cita.id,
      medicoId: cita.medicoId,
      pacienteId: cita.pacienteId,
      estadoAnterior,
      estadoNuevo: "ACEPTADO",
      tenantId,
    })

    return actualizada
  }
}
