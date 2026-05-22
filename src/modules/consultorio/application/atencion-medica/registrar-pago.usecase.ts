import type { IAtencionMedicaRepository, PagoDTO } from "../../domain/ports/IAtencionMedicaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { AtencionMedicaEntity } from "../../domain/atencion-medica.entity.js"
import { PagoExcedeTotalError } from "../../domain/consultorio.errors.js"

export class RegistrarPagoUseCase {
  constructor(
    private readonly repo: IAtencionMedicaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(atencionId: string, data: PagoDTO, userId: string, consultorioId: string, tenantId: string): Promise<AtencionMedicaEntity> {
    const atencion = await this.repo.obtener(atencionId, consultorioId)

    if (data.monto > atencion.calcularSaldoPendiente()) throw new PagoExcedeTotalError()

    const actualizada = await this.repo.registrarPago(atencionId, data, userId)

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
