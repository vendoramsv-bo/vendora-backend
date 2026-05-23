import type {
  IInventarioProductoRepository,
  VarianteStockData,
  RegistrarAjusteDTO,
  RegistrarRecuentoDTO,
  AjusteResultado,
  RecuentoResultado,
} from "../../src/modules/almacen/domain/ports/IInventarioProductoRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"

export class FakeInventarioProductoRepository implements IInventarioProductoRepository {
  private _variantes = new Map<string, VarianteStockData>()

  seed(variante: VarianteStockData): void {
    this._variantes.set(`${variante.id}:${variante.productoId.split(":")[0] ?? "t1"}`, variante)
    // also index by id alone for simpler lookup
    this._variantes.set(variante.id, variante)
  }

  async findVariante(varianteId: string, _tenantId: string): Promise<VarianteStockData | null> {
    return this._variantes.get(varianteId) ?? null
  }

  async registrarAjuste(dto: RegistrarAjusteDTO): Promise<AjusteResultado> {
    const detalles: AjusteResultado["detalles"] = []
    for (const d of dto.detalles) {
      const key = d.varianteId ?? ""
      const v = this._variantes.get(key)
      if (!v) throw new Error(`Variante ${key} no encontrada`)
      const stockAntes = v.cantidadStock
      const stockDespues = stockAntes + d.cantidadAjuste
      v.cantidadStock = stockDespues
      detalles.push({
        varianteId: v.id,
        stockAntes,
        stockDespues,
        stockMinimo: v.stockMinimo,
        productoId: v.productoId,
        productoNombre: v.productoNombre,
        sku: v.sku,
      })
    }
    return { ajusteId: `ajuste-${Date.now()}`, detalles }
  }

  async registrarRecuento(dto: RegistrarRecuentoDTO): Promise<RecuentoResultado> {
    const detalles: RecuentoResultado["detalles"] = []
    for (const d of dto.detalles) {
      const key = d.varianteId ?? ""
      const v = this._variantes.get(key)
      if (!v) throw new Error(`Variante ${key} no encontrada`)
      const stockAntes = v.cantidadStock
      const stockDespues = d.stockFisico
      v.cantidadStock = stockDespues
      detalles.push({
        varianteId: v.id,
        stockAntes,
        stockDespues,
        stockMinimo: v.stockMinimo,
        productoId: v.productoId,
        productoNombre: v.productoNombre,
        sku: v.sku,
        diferencia: stockDespues - stockAntes,
      })
    }
    return { recuentoId: `recuento-${Date.now()}`, detalles }
  }

  async listarAjustes(_tenantId: string, _params: QueryParams) {
    return { data: [], total: 0 }
  }

  async listarRecuentos(_tenantId: string, _params: QueryParams) {
    return { data: [], total: 0 }
  }

  async listarMovimientos(_varianteId: string, _tenantId: string, _params: QueryParams) {
    return { data: [], total: 0 }
  }
}
