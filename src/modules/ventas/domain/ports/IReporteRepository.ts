export interface ReporteIngresoDTO {
  id: string
  fecha: Date
  monto: number
  tipoPago: string
  estado: string
  fuente: "VENTA" | "CONSULTORIO"
  clienteNombre: string | null
  puntoVentaId: string | null
}

export interface ReporteFiltros {
  fechaDesde?: Date
  fechaHasta?: Date
  fuente?: "VENTA" | "CONSULTORIO"
  puntoVentaId?: string
  /**
   * Filtro **interno** del alcance: lo puebla el servidor desde la sesión
   * (023 contracts §A.1), nunca el cliente. Con valor, el reporte trae solo
   * las operaciones de esa persona; sin valor, las de todo el negocio.
   */
  tenantMemberId?: string
}

export interface IReporteRepository {
  getConsolidado(tenantId: string, filters: ReporteFiltros, take: number, skip: number): Promise<{ data: ReporteIngresoDTO[]; total: number }>
}
