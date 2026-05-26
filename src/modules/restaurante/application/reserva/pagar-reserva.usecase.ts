import type { IReservaRepository } from "../../domain/ports/IReservaRepository.js"
import type { IRestauranteVentaService } from "../../domain/ports/IRestauranteVentaService.js"
import type { IRestauranteNotificador } from "../../domain/ports/IRestauranteNotificador.js"
import type { ReservaEntity } from "../../domain/reserva.entity.js"
import { ReservaNoEncontrada, ReservaYaPagada } from "../../domain/restaurante.errors.js"

export class PagarReservaUseCase {
  constructor(
    private readonly reservaRepo: IReservaRepository,
    private readonly ventaService: IRestauranteVentaService,
    private readonly notificador: IRestauranteNotificador,
  ) {}

  async ejecutar(
    id: string,
    restauranteId: string,
    tenantId: string,
    userId: string,
    cajaId: string,
    cajeroId: string,
  ): Promise<ReservaEntity> {
    const result = await this.reservaRepo.findById(id, restauranteId)
    if (!result) throw new ReservaNoEncontrada(id)

    if (result.estaPagada()) throw new ReservaYaPagada()

    const { ventaId } = await this.ventaService.crearDesdeReserva({
      tenantId,
      restauranteId,
      reservaId: result.id,
      reservaCodigo: result.codigo,
      items: (result.detalles ?? []).map((d) => ({
        nombre: d.productoNombre,
        cantidad: d.cantidad,
        precioUnitario: d.precio,
        subtotal: d.subtotal,
      })),
      total: result.totalEstimado,
      cajaId,
      cajeroId,
    })

    const estadoAnterior = result.estado
    const pagada = await this.reservaRepo.update(id, { estado: "PAGADA", ventaId }, userId)
    await this.reservaRepo.logEstadoCambio(id, estadoAnterior, "PAGADA", userId)

    this.notificador.reservaActualizada(tenantId, {
      reservaId: pagada.id,
      codigo: pagada.codigo,
      estadoAnterior,
      estadoNuevo: "PAGADA",
      cambiadoPorId: userId,
      fecha: new Date().toISOString(),
      tenantId,
    })

    return pagada
  }
}
