export interface SalidaVentaDetalle {
  productoId: string
  varianteId?: string
  cantidad: number
}

export interface IAlmacenInventarioPort {
  registrarSalidaVenta(ventaId: string, tenantId: string, detalles: SalidaVentaDetalle[]): Promise<void>
  inicializarProducto(tenantId: string, productoId: string, varianteId?: string): Promise<void>
}
