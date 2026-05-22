import type { ICitaRepository, CitaCreateDTO } from "../../domain/ports/ICitaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { CitaEntity } from "../../domain/cita.entity.js"
import { CitaSolapada } from "../../domain/consultorio.errors.js"
import { recordatoriosQueue } from "../../../../core/recordatorios.queue.js"

export class CrearCitaUseCase {
  constructor(
    private readonly repo: ICitaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(data: CitaCreateDTO, consultorioId: string, userId: string, tenantId: string): Promise<CitaEntity> {
    const duracionMin = data.duracionMin ?? 30
    const solapa = await this.repo.verificarSolapamiento(consultorioId, data.medicoId, data.fechaHora, duracionMin)
    if (solapa) throw new CitaSolapada()

    const cita = await this.repo.crear({ ...data, duracionMin }, consultorioId, userId)

    this.notificador.citaCreada(tenantId, {
      citaId: cita.id,
      medicoId: cita.medicoId,
      pacienteId: cita.pacienteId,
      fechaHora: cita.fechaHora.toISOString(),
      estado: cita.estado,
      tenantId,
    })

    await recordatoriosQueue.add("recordatorio-cita", { citaId: cita.id, canal: "EMAIL" })

    return cita
  }
}
