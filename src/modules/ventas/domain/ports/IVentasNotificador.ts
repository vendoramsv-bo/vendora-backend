export interface ClienteCreadoPayload {
  clienteId: string
  nombre: string
  tenantId: string
}

export interface ClienteActualizadoPayload {
  clienteId: string
  nombre: string
  tenantId: string
}

export interface ProveedorCreadoPayload {
  proveedorId: string
  nombre: string
  tenantId: string
}

export interface ProveedorActualizadoPayload {
  proveedorId: string
  nombre: string
  tenantId: string
}

export interface CompraCreadaPayload {
  compraId: string
  proveedorId: string
  estado: string
  tenantId: string
}

export interface CompraActualizadaPayload {
  compraId: string
  proveedorId: string
  estado: string
  tenantId: string
}

export interface CompraConfirmadaPayload {
  compraId: string
  proveedorId: string
  tenantId: string
}

export interface VentaCreadaPayload {
  ventaId: string
  tenantId: string
  aperturaCierreCajaId: string
  totalVenta: number
}

export interface CajaAbiertaPayload {
  cajaId: string
  tenantId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
}

export interface CajaCerradaPayload {
  cajaId: string
  tenantId: string
  montoArqueoCaja: number
}

export interface PedidoActualizadoPayload {
  pedidoId: string
  tenantId: string
  estado: string
}

export interface IVentasNotificador {
  clienteCreado(tenantId: string, payload: ClienteCreadoPayload): void
  clienteActualizado(tenantId: string, payload: ClienteActualizadoPayload): void
  proveedorCreado(tenantId: string, payload: ProveedorCreadoPayload): void
  proveedorActualizado(tenantId: string, payload: ProveedorActualizadoPayload): void
  compraCreada(tenantId: string, payload: CompraCreadaPayload): void
  compraActualizada(tenantId: string, payload: CompraActualizadaPayload): void
  compraConfirmada(tenantId: string, payload: CompraConfirmadaPayload): void
  ventaCreada(tenantId: string, payload: VentaCreadaPayload): void
  cajaAbierta(tenantId: string, payload: CajaAbiertaPayload): void
  cajaCerrada(tenantId: string, payload: CajaCerradaPayload): void
  pedidoActualizado(tenantId: string, payload: PedidoActualizadoPayload): void
}
