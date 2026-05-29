export interface StockCriticoPayload {
  productoId: string
  productoNombre: string
  varianteId?: string | null
  varianteSku?: string | null
  stockActual: number
  stockMinimo: number
  tenantId: string
}

export interface StockNormalizadoPayload {
  productoId: string
  productoNombre: string
  varianteId?: string | null
  varianteSku?: string | null
  stockActual: number
  stockMinimo: number
  tenantId: string
}

export interface InsumoStockCriticoPayload {
  insumoId: string
  insumoNombre: string
  stockActual: number
  stockMinimo: number
  tenantId: string
}

export interface InsumoStockNormalizadoPayload {
  insumoId: string
  insumoNombre: string
  stockActual: number
  stockMinimo: number
  tenantId: string
}

export interface IAlmacenNotificador {
  stockCritico(tenantId: string, payload: StockCriticoPayload): void
  stockNormalizado(tenantId: string, payload: StockNormalizadoPayload): void
  insumoStockCritico(tenantId: string, payload: InsumoStockCriticoPayload): void
  insumoStockNormalizado(tenantId: string, payload: InsumoStockNormalizadoPayload): void
}
