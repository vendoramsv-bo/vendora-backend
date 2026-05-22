export interface ActividadCreadaPayload {
  tenantId: string
  actividadId: string
  nombre: string
}

export interface CategoriaCreadaPayload {
  tenantId: string
  categoriaId: string
  nombre: string
  padreId: string | null
  actividadId: string
}

export interface CategoriaActualizadaPayload {
  tenantId: string
  categoriaId: string
  nombre: string
  estado: string
}

export interface ProductoCreadoPayload {
  tenantId: string
  productoId: string
  nombre: string
  categoriaId: string
  precio: string
  tipoProducto: string
}

export interface ProductoActualizadoPayload {
  tenantId: string
  productoId: string
  precio: string
}

export interface ProductoEstadoCambiadoPayload {
  tenantId: string
  productoId: string
  estado: string
}

export interface OfertaCreadaPayload {
  tenantId: string
  ofertaId: string
  productoId: string
  precioOferta: string
  fechaFin: string
}

export interface OfertaActualizadaPayload {
  tenantId: string
  ofertaId: string
  productoId: string
  estado: string
}

export interface ICatalogoNotificador {
  actividadCreada(tenantId: string, payload: ActividadCreadaPayload): void
  categoriaCreada(tenantId: string, payload: CategoriaCreadaPayload): void
  categoriaActualizada(tenantId: string, payload: CategoriaActualizadaPayload): void
  productoCreado(tenantId: string, payload: ProductoCreadoPayload): void
  productoActualizado(tenantId: string, payload: ProductoActualizadoPayload): void
  productoEstadoCambiado(tenantId: string, payload: ProductoEstadoCambiadoPayload): void
  ofertaCreada(tenantId: string, payload: OfertaCreadaPayload): void
  ofertaActualizada(tenantId: string, payload: OfertaActualizadaPayload): void
}
