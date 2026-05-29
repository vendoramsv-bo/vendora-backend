import type { QueryParams } from "../../../../core/query-params.js"

// ─── DTOs de variante ────────────────────────────────────────────────────────

export interface VarianteStockData {
  id: string
  productoId: string
  productoNombre: string
  sku: string | null
  cantidadStock: number
  stockMinimo: number
  inventarioActivado: boolean
}

// ─── DTOs de Ajuste ──────────────────────────────────────────────────────────

export interface AjusteDetalleInput {
  productoId: string
  varianteId?: string
  cantidadAjuste: number
}

export interface CrearAjusteDTO {
  tenantId: string
  motivo?: string
  detalles: AjusteDetalleInput[]
  tenantMemberId?: string
  createdById?: string
}

export interface ActualizarAjusteDTO {
  motivo?: string
  detalles?: AjusteDetalleInput[]
  updatedById?: string
}

export interface AprobarAjusteDTO {
  ajusteId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
}

export interface AjusteDetalle {
  productoId: string
  varianteId?: string | null
  cantidadAjuste: number
  stockAnterior: number
  stockDespues: number
}

export interface AjusteDoc {
  id: string
  tenantId: string
  estado: string
  motivo?: string | null
  version: number
  detalles: AjusteDetalle[]
}

export interface AprobarAjusteResultado {
  ajusteId: string
  estado: string
  version: number
  detalles: Array<{
    productoId: string
    varianteId?: string | null
    stockAntes: number
    stockDespues: number
    stockMinimo: number
    productoNombre: string
    sku: string | null
  }>
}

// ─── DTOs de Recuento ────────────────────────────────────────────────────────

export interface RecuentoDetalleInput {
  productoId: string
  varianteId?: string
  stockFisico: number
}

export interface CrearRecuentoDTO {
  tenantId: string
  observacion?: string
  detalles: RecuentoDetalleInput[]
  tenantMemberId?: string
  createdById?: string
}

export interface ActualizarRecuentoDTO {
  observacion?: string
  detalles?: RecuentoDetalleInput[]
  updatedById?: string
}

export interface AprobarRecuentoDTO {
  recuentoId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
}

export interface RecuentoDetalle {
  productoId: string
  varianteId?: string | null
  stockSistema: number
  stockFisico: number
  diferencia: number
}

export interface RecuentoDoc {
  id: string
  tenantId: string
  estado: string
  observacion?: string | null
  version: number
  detalles: RecuentoDetalle[]
}

export interface AprobarRecuentoResultado {
  recuentoId: string
  estado: string
  version: number
  detalles: Array<{
    productoId: string
    varianteId?: string | null
    stockAntes: number
    stockDespues: number
    diferencia: number
    stockMinimo: number
    productoNombre: string
    sku: string | null
  }>
}

// ─── DTOs de inicialización y movimientos ────────────────────────────────────

export interface InicializarBulkResultado {
  productosInicializados: number
  variantesInicializadas: number
}

export interface MovimientoSalidaDetalle {
  productoId: string
  varianteId?: string
  cantidad: number
}

// ─── Puerto ──────────────────────────────────────────────────────────────────

export interface IInventarioProductoRepository {
  findVariante(varianteId: string, tenantId: string): Promise<VarianteStockData | null>

  // Ajustes
  crearAjuste(dto: CrearAjusteDTO): Promise<AjusteDoc>
  obtenerAjuste(id: string, tenantId: string): Promise<AjusteDoc | null>
  actualizarAjuste(id: string, tenantId: string, dto: ActualizarAjusteDTO): Promise<AjusteDoc>
  aprobarAjuste(dto: AprobarAjusteDTO): Promise<AprobarAjusteResultado>

  // Recuentos
  crearRecuento(dto: CrearRecuentoDTO): Promise<RecuentoDoc>
  obtenerRecuento(id: string, tenantId: string): Promise<RecuentoDoc | null>
  actualizarRecuento(id: string, tenantId: string, dto: ActualizarRecuentoDTO): Promise<RecuentoDoc>
  aprobarRecuento(dto: AprobarRecuentoDTO): Promise<AprobarRecuentoResultado>

  // Inicialización
  inicializarStockBulk(tenantId: string, createdById?: string): Promise<InicializarBulkResultado>
  inicializarProductoIndividual(tenantId: string, productoId: string, varianteId?: string, createdById?: string): Promise<void>

  // Movimiento de salida idempotente (para ventas)
  registrarMovimientoSalidaIdempotente(
    tenantId: string,
    ventaId: string,
    detalles: MovimientoSalidaDetalle[],
    createdById?: string
  ): Promise<void>

  // Listados
  listarAjustes(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
  listarRecuentos(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
  listarMovimientos(varianteId: string, tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
