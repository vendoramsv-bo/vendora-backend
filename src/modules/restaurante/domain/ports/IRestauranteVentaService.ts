export interface VentaItemReserva {
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface CrearVentaDesdeReservaInput {
  tenantId: string
  restauranteId: string
  reservaId: string
  reservaCodigo: string
  items: VentaItemReserva[]
  total: number
  cajaId: string
  cajeroId: string
}

export interface IRestauranteVentaService {
  crearDesdeReserva(data: CrearVentaDesdeReservaInput): Promise<{ ventaId: string; numeroVenta: string }>
}
