import type { IAtencionMedicaRepository } from "../../domain/ports/IAtencionMedicaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { AtencionMedicaEntity } from "../../domain/atencion-medica.entity.js"
import { AtencionYaPagada } from "../../domain/consultorio.errors.js"

export class AnularAtencionUseCase {
  constructor(
    private readonly repo: IAtencionMedicaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(id: string, userId: string, consultorioId: string, tenantId: string): Promise<AtencionMedicaEntity> {
    const atencion = await this.repo.obtener(id, consultorioId)
    if (atencion.estadoPago === "PAGADO") throw new AtencionYaPagada()

    const actualizada = await this.repo.actualizarEstado(id, "ANULADA", atencion.estadoPago, userId)

    this.notificador.atencionCambiada(tenantId, {
      atencionId: actualizada.id,
      pacienteId: actualizada.pacienteId,
      medicoId: actualizada.medicoId,
      estadoPago: actualizada.estadoPago,
      estado: actualizada.estado,
      total: String(actualizada.total),
      tenantId,
    })

    return actualizada
  }
}
