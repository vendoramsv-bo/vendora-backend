import type { IHistoriaClinicaRepository, HistoriaCreateDTO } from "../../domain/ports/IHistoriaClinicaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { HistoriaClinicaEntity } from "../../domain/historia-clinica.entity.js"

export class CrearHistoriaUseCase {
  constructor(
    private readonly repo: IHistoriaClinicaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(data: HistoriaCreateDTO, consultorioId: string, userId: string, tenantId: string): Promise<HistoriaClinicaEntity> {
    const historia = await this.repo.crear(data, consultorioId, userId)
    await this.notificador.historiaCreada({
      historiaId: historia.id,
      pacienteId: historia.pacienteId,
      medicoId: historia.medicoId,
      especialidad: historia.especialidad,
      tenantId,
    })
    return historia
  }
}
