export interface ReservaEventoPayload {
  reservaId: string
  codigo: string
  clienteNombre: string
  fechaLlegada: string
  numeroComensales: number
  estado: string
  totalItems: number
  tenantId: string
}

export interface ReservaActualizadaPayload {
  reservaId: string
  codigo: string
  estadoAnterior: string
  estadoNuevo: string
  cambiadoPorId: string
  fecha: string
  tenantId: string
}

export interface PlatoCocinaPayload {
  reservaId: string
  codigo: string
  detalleId: string
  productoNombre: string
  estadoAnterior: string
  estadoNuevo: string
  cambiadoPorId: string
  fecha: string
  tenantId: string
}

export interface IRestauranteNotificador {
  reservaCreada(tenantId: string, payload: ReservaEventoPayload): void
  reservaActualizada(tenantId: string, payload: ReservaActualizadaPayload): void
  platoCocinaActualizado(tenantId: string, payload: PlatoCocinaPayload): void
}
