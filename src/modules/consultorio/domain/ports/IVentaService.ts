export interface VentaDetalleAtencion {
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
}

export interface CrearDesdeAtencionInput {
  atencionId: string
  consultorioId: string
  tenantId: string
  pacienteId: string
  descripcion: string
  detalle: VentaDetalleAtencion[]
  total: number
  aperturaCierreCajaId?: string
  puntoVentaId?: string
  turnoId?: string
  creadoPorId: string
}

export interface IVentaService {
  crearDesdeAtencion(data: CrearDesdeAtencionInput): Promise<{ ventaId: string }>
}
