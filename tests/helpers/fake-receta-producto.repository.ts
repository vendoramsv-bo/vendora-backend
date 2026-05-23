import type { IRecetaProductoRepository, RecetaLinea, DefinirRecetaDTO } from "../../src/modules/almacen/domain/ports/IRecetaProductoRepository.js"

type RecetaKey = string // `${productoId}:${varianteId|null}`

export class FakeRecetaProductoRepository implements IRecetaProductoRepository {
  private _recetas = new Map<RecetaKey, RecetaLinea[]>()
  private _referencingMap = new Map<string, string[]>()

  seedReferencingProducts(insumoId: string, productoIds: string[]): void {
    this._referencingMap.set(insumoId, productoIds)
  }

  async findByProducto(productoId: string): Promise<RecetaLinea[]> {
    return this._recetas.get(`${productoId}:null`) ?? []
  }

  async findByVariante(productoId: string, varianteId: string): Promise<RecetaLinea[]> {
    return this._recetas.get(`${productoId}:${varianteId}`) ?? []
  }

  async upsert(dto: DefinirRecetaDTO): Promise<RecetaLinea[]> {
    const key: RecetaKey = `${dto.productoId}:${dto.varianteId ?? "null"}`
    const lineas: RecetaLinea[] = dto.lineas.map((l) => ({
      insumoId: l.insumoId,
      insumoNombre: `Insumo ${l.insumoId}`,
      cantidad: l.cantidad,
      unidadSigla: "kg",
    }))
    this._recetas.set(key, lineas)
    return lineas
  }

  async delete(productoId: string, varianteId: string | null): Promise<void> {
    const key: RecetaKey = `${productoId}:${varianteId ?? "null"}`
    this._recetas.delete(key)
  }

  async findReferencingProducts(insumoId: string, _tenantId: string): Promise<string[]> {
    return this._referencingMap.get(insumoId) ?? []
  }
}
