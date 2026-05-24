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
}

export interface IReporteRepository {
  getConsolidado(tenantId: string, filters: ReporteFiltros, take: number, skip: number): Promise<{ data: ReporteIngresoDTO[]; total: number }>
}
