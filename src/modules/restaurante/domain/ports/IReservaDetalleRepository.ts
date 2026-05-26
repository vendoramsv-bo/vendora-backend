import type { ReservaDetalleEntity } from "../reserva-detalle.entity.js"

export interface IReservaDetalleRepository {
  findByReserva(reservaId: string): Promise<ReservaDetalleEntity[]>
  findById(id: string): Promise<ReservaDetalleEntity | null>
  create(data: {
    reservaId: string
    menuItemId?: string | null
    productoId: string
    productoNombre: string
    productoImagen?: string | null
    cantidad: number
    precio: number
    subtotal: number
    observacion?: string | null
  }): Promise<ReservaDetalleEntity>
  updateEstadoCocina(id: string, estadoCocina: string): Promise<ReservaDetalleEntity>
  countByEstadoCocina(reservaId: string, estadoCocina: string): Promise<number>
}
