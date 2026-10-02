export const ORIGENES_MOVIMIENTO = ["INSUMO", "VARIANTE"] as const
export type OrigenMovimiento = (typeof ORIGENES_MOVIMIENTO)[number]

// Vocabulario común a las dos tablas: el `INGRESO` de insumos se lee como `ENTRADA`.
export const TIPOS_MOVIMIENTO_TENANT = ["CREACION", "ENTRADA", "SALIDA", "AJUSTE", "RECUENTO"] as const
export type TipoMovimientoTenant = (typeof TIPOS_MOVIMIENTO_TENANT)[number]

export interface MovimientoTenant {
  id: string
  origen: OrigenMovimiento
  insumoId: string | null
  productoId: string | null
  varianteId: string | null
  nombreEntidad: string
  etiquetaVariante: string | null
  tipo: TipoMovimientoTenant
  cantidad: number
  stockAntes: number
  stockDespues: number
  motivo: string | null
  referenciaId: string | null
  createdAt: string
}
