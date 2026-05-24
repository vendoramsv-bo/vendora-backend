import type { IAtencionMedicaRepository, PagoDTO } from "../../domain/ports/IAtencionMedicaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { IVentaService } from "../../domain/ports/IVentaService.js"
import type { AtencionMedicaEntity } from "../../domain/atencion-medica.entity.js"
import { PagoExcedeTotalError } from "../../domain/consultorio.errors.js"

export interface RegistrarPagoInput extends PagoDTO {
  aperturaCierreCajaId?: string
  puntoVentaId?: string
  turnoId?: string
}

export class RegistrarPagoUseCase {
  constructor(
    private readonly repo: IAtencionMedicaRepository,
    private readonly notificador: IConsultorioNotificador,
    private readonly ventaService?: IVentaService,
  ) {}

  async ejecutar(atencionId: string, data: RegistrarPagoInput, userId: string, consultorioId: string, tenantId: string): Promise<AtencionMedicaEntity> {
    const atencion = await this.repo.obtener(atencionId, consultorioId)

    if (data.monto > atencion.calcularSaldoPendiente()) throw new PagoExcedeTotalError()

    const actualizada = await this.repo.registrarPago(atencionId, data, userId)

    if (actualizada.estadoPago === "PAGADO" && this.ventaService) {
      const detalle = (atencion.detalle ?? []).map((d) => ({
        descripcion: d.servicioNombre,
        cantidad: d.cantidad,
        precioUnitario: Number(d.precioUnitario),
        descuento: Number(d.descuento),
      }))
      await this.ventaService.crearDesdeAtencion({
        atencionId,
        consultorioId,
        tenantId,
        pacienteId: atencion.pacienteId,
        descripcion: `Atención médica ${atencionId}`,
        detalle,
        total: Number(atencion.total),
        aperturaCierreCajaId: data.aperturaCierreCajaId,
        puntoVentaId: data.puntoVentaId,
        turnoId: data.turnoId,
        creadoPorId: userId,
      }).catch(() => {})
    }

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
