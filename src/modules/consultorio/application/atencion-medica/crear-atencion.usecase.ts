import type { IAtencionMedicaRepository, AtencionCreateDTO } from "../../domain/ports/IAtencionMedicaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { AtencionMedicaEntity } from "../../domain/atencion-medica.entity.js"

export class CrearAtencionUseCase {
  constructor(
    private readonly repo: IAtencionMedicaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(data: AtencionCreateDTO, consultorioId: string, userId: string, tenantId: string): Promise<AtencionMedicaEntity> {
    const atencion = await this.repo.crear(data, consultorioId, userId)
    this.notificador.atencionCambiada(tenantId, {
      atencionId: atencion.id,
      pacienteId: atencion.pacienteId,
      medicoId: atencion.medicoId,
      estadoPago: atencion.estadoPago,
      estado: atencion.estado,
      total: String(atencion.total),
      tenantId,
    })
    return atencion
  }
}
