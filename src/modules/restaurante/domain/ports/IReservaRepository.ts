import type { ReservaEntity } from "../reserva.entity.js"
import type { ReservaDetalleEntity } from "../reserva-detalle.entity.js"

export interface ReservaQueryParams {
  estado?: string
  fecha?: Date
  search?: string
  page?: number
  limit?: number
}

export interface ReservaCreateData {
  restauranteId: string
  codigo: string
  clienteId?: string | null
  clienteNombre: string
  clienteTelefono?: string | null
  clienteEmail?: string | null
  menuId?: string | null
  fechaLlegada: Date
  numeroComensales: number
  observaciones?: string | null
  canalOrigen?: string | null
  totalCantidad: number
  totalEstimado: number
  detalles: ReservaDetalleCreateData[]
}

export interface ReservaDetalleCreateData {
  menuItemId?: string | null
  productoId: string
  productoNombre: string
  productoImagen?: string | null
  cantidad: number
  precio: number
  subtotal: number
  observacion?: string | null
}

export interface ReservaUpdateData {
  estado?: string
  numeroMesa?: string | null
  atendidaPorId?: string | null
  fechaConfirmacion?: Date | null
  fechaCancelacion?: Date | null
  motivoCancelacion?: string | null
  ventaId?: string | null
}

export interface IReservaRepository {
  findAllByRestaurante(restauranteId: string, params?: ReservaQueryParams): Promise<ReservaEntity[]>
  findById(id: string, restauranteId?: string): Promise<(ReservaEntity & { detalles: ReservaDetalleEntity[] }) | null>
  findByCodigo(restauranteId: string, codigo: string): Promise<ReservaEntity | null>
  countByRestauranteAndFecha(restauranteId: string, fecha: Date): Promise<number>
  create(data: ReservaCreateData, userId: string): Promise<ReservaEntity>
  update(id: string, data: ReservaUpdateData, userId: string): Promise<ReservaEntity>
  findByClienteEmail(restauranteId: string, email: string): Promise<ReservaEntity[]>
  logEstadoCambio(reservaId: string, estadoAnterior: string | null, estadoNuevo: string, userId: string | null, nota?: string): Promise<void>
}
