import type { IReservaRepository } from "../../domain/ports/IReservaRepository.js"
import type { IMenuItemRepository } from "../../domain/ports/IMenuItemRepository.js"
import type { IRestauranteNotificador } from "../../domain/ports/IRestauranteNotificador.js"
import type { ReservaEntity } from "../../domain/reserva.entity.js"
import { ReservaEntity as Reserva } from "../../domain/reserva.entity.js"
import { ItemNoDisponible } from "../../domain/restaurante.errors.js"

export interface CrearReservaPublicaInput {
  restauranteId: string
  tenantId: string
  menuId?: string | null
  clienteNombre: string
  clienteTelefono?: string | null
  clienteEmail?: string | null
  clienteId?: string | null
  fechaLlegada: Date
  numeroComensales: number
  observaciones?: string | null
  canalOrigen?: string | null
  items: Array<{
    menuItemId: string
    cantidad: number
    observacion?: string | null
  }>
}

export class CrearReservaPublicaUseCase {
  constructor(
    private readonly reservaRepo: IReservaRepository,
    private readonly menuItemRepo: IMenuItemRepository,
    private readonly notificador: IRestauranteNotificador,
  ) {}

  async ejecutar(input: CrearReservaPublicaInput): Promise<ReservaEntity> {
    // Validate all items are available
    const itemsResueltos = await Promise.all(
      input.items.map(async (i) => {
        const item = await this.menuItemRepo.findById(i.menuItemId)
        if (!item || !item.estaDisponible()) {
          throw new ItemNoDisponible(i.menuItemId)
        }
        return { item, cantidad: i.cantidad, observacion: i.observacion ?? null }
      }),
    )

    // Generate unique code with retry
    const hoy = new Date()
    const contadorBase = await this.reservaRepo.countByRestauranteAndFecha(input.restauranteId, hoy)
    let codigo = Reserva.generarCodigo(hoy, contadorBase + 1)

    // Check for code conflict and retry with incremented counter
    let intento = 0
    while (await this.reservaRepo.findByCodigo(input.restauranteId, codigo)) {
      intento++
      codigo = Reserva.generarCodigo(hoy, contadorBase + 1 + intento)
    }

    const totalCantidad = itemsResueltos.reduce((sum, ir) => sum + ir.cantidad, 0)
    const totalEstimado = itemsResueltos.reduce(
      (sum, ir) => sum + ir.item.precio * ir.cantidad,
      0,
    )

    const reserva = await this.reservaRepo.create(
      {
        restauranteId: input.restauranteId,
        codigo,
        clienteId: input.clienteId ?? null,
        clienteNombre: input.clienteNombre,
        clienteTelefono: input.clienteTelefono ?? null,
        clienteEmail: input.clienteEmail ?? null,
        menuId: input.menuId ?? null,
        fechaLlegada: input.fechaLlegada,
        numeroComensales: input.numeroComensales,
        observaciones: input.observaciones ?? null,
        canalOrigen: input.canalOrigen ?? "WEB",
        totalCantidad,
        totalEstimado,
        detalles: itemsResueltos.map((ir) => ({
          menuItemId: ir.item.id,
          productoId: ir.item.productoId,
          productoNombre: ir.item.nombreSnapshot,
          productoImagen: ir.item.imagenSnapshot,
          cantidad: ir.cantidad,
          precio: ir.item.precio,
          subtotal: ir.item.precio * ir.cantidad,
          observacion: ir.observacion,
        })),
      },
      input.clienteId ?? "PUBLICO",
    )

    await this.reservaRepo.logEstadoCambio(reserva.id, null, "RESERVADA", input.clienteId ?? null)

    this.notificador.reservaCreada(input.tenantId, {
      reservaId: reserva.id,
      codigo: reserva.codigo,
      clienteNombre: reserva.clienteNombre,
      fechaLlegada: reserva.fechaLlegada.toISOString(),
      numeroComensales: reserva.numeroComensales,
      totalItems: totalCantidad,
      estado: "RESERVADA",
      tenantId: input.tenantId,
    })

    return reserva
  }
}
