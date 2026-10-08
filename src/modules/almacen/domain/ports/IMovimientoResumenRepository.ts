/**
 * Lo que necesita el resumen del historial de un producto (spec 032, B-03).
 */
export interface VarianteResumen {
  varianteId: string
  etiqueta: string
  stock: number
}

export interface ProductoResumen {
  cantidadStock: number
  /** Solo las activas; `[]` si el producto no tiene variantes. */
  variantes: VarianteResumen[]
}

export interface ResumenMovimientos {
  /** Suma de las cantidades positivas. */
  entradas: number
  /** Suma de las cantidades negativas (valor negativo). */
  salidas: number
  /** El stock del producto, o el de la variante si se filtró por una. */
  stockActual: number
  variantes: VarianteResumen[]
}

export interface IMovimientoResumenRepository {
  /** `null` si el producto no es del tenant. */
  leerProducto(tenantId: string, productoId: string): Promise<ProductoResumen | null>
  /** El stock de la variante; `null` si no es de ese producto (activa o no). */
  leerStockVariante(tenantId: string, productoId: string, varianteId: string): Promise<number | null>
  sumarMovimientos(
    tenantId: string,
    productoId: string,
    varianteId?: string,
  ): Promise<{ entradas: number; salidas: number }>
}
