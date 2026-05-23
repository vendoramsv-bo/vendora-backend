export interface RecetaLineaDTO {
  insumoId: string
  cantidad: number
}

export interface RecetaLinea {
  insumoId: string
  insumoNombre: string
  cantidad: number
  unidadSigla: string
}

export interface DefinirRecetaDTO {
  productoId: string
  varianteId: string | null
  lineas: RecetaLineaDTO[]
}

export interface IRecetaProductoRepository {
  findByProducto(productoId: string): Promise<RecetaLinea[]>
  findByVariante(productoId: string, varianteId: string): Promise<RecetaLinea[]>
  upsert(dto: DefinirRecetaDTO): Promise<RecetaLinea[]>
  delete(productoId: string, varianteId: string | null): Promise<void>
  findReferencingProducts(insumoId: string, tenantId: string): Promise<string[]>
}
