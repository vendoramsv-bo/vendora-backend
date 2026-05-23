import type {
  IInsumoRepository,
  InsumoData,
  CrearInsumoDTO,
  ActualizarInsumoDTO,
  AjusteInsumoDTO,
  AjusteInsumoResultado,
} from "../../src/modules/almacen/domain/ports/IInsumoRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"

export class FakeInsumoRepository implements IInsumoRepository {
  private _insumos = new Map<string, InsumoData>()
  private _counter = 1

  seed(insumo: InsumoData): void {
    this._insumos.set(insumo.id, insumo)
  }

  async findById(id: string, tenantId: string): Promise<InsumoData | null> {
    const ins = this._insumos.get(id)
    if (!ins || ins.tenantId !== tenantId) return null
    return ins
  }

  async findByNombre(nombre: string, tenantId: string): Promise<InsumoData | null> {
    for (const ins of this._insumos.values()) {
      if (ins.nombre === nombre && ins.tenantId === tenantId) return ins
    }
    return null
  }

  async create(dto: CrearInsumoDTO): Promise<InsumoData> {
    const id = `insumo-${this._counter++}`
    const insumo: InsumoData = {
      id,
      tenantId: dto.tenantId,
      nombre: dto.nombre,
      unidadMedidaId: dto.unidadMedidaId,
      cantidadStock: 0,
      stockMinimo: dto.stockMinimo ?? 0,
      costoUnitario: dto.costoUnitario ?? 0,
      fechaVencimiento: dto.fechaVencimiento ?? null,
      estado: "ACTIVO",
      createdAt: new Date(),
    }
    this._insumos.set(id, insumo)
    return insumo
  }

  async update(id: string, tenantId: string, dto: ActualizarInsumoDTO): Promise<InsumoData> {
    const ins = this._insumos.get(id)
    if (!ins || ins.tenantId !== tenantId) throw new Error(`Insumo ${id} no encontrado`)
    const updated: InsumoData = {
      ...ins,
      nombre: dto.nombre ?? ins.nombre,
      unidadMedidaId: dto.unidadMedidaId ?? ins.unidadMedidaId,
      stockMinimo: dto.stockMinimo ?? ins.stockMinimo,
      costoUnitario: dto.costoUnitario ?? ins.costoUnitario,
      fechaVencimiento: dto.fechaVencimiento !== undefined ? dto.fechaVencimiento : ins.fechaVencimiento,
    }
    this._insumos.set(id, updated)
    return updated
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const ins = this._insumos.get(id)
    if (!ins || ins.tenantId !== tenantId) throw new Error(`Insumo ${id} no encontrado`)
    this._insumos.delete(id)
  }

  async cambiarEstado(id: string, tenantId: string, estado: string, _updatedById?: string): Promise<InsumoData> {
    const ins = this._insumos.get(id)
    if (!ins || ins.tenantId !== tenantId) throw new Error(`Insumo ${id} no encontrado`)
    const updated: InsumoData = { ...ins, estado }
    this._insumos.set(id, updated)
    return updated
  }

  async registrarAjuste(dto: AjusteInsumoDTO): Promise<AjusteInsumoResultado> {
    const ins = this._insumos.get(dto.insumoId)
    if (!ins || ins.tenantId !== dto.tenantId) throw new Error(`Insumo ${dto.insumoId} no encontrado`)
    const stockAntes = ins.cantidadStock
    const stockDespues = stockAntes + dto.cantidadAjuste
    ins.cantidadStock = stockDespues
    return {
      insumoId: ins.id,
      insumoNombre: ins.nombre,
      stockAntes,
      stockDespues,
      stockMinimo: ins.stockMinimo,
    }
  }

  async listar(tenantId: string, _params: QueryParams, _stockCritico?: boolean): Promise<{ data: unknown[]; total: number }> {
    const data = Array.from(this._insumos.values()).filter((i) => i.tenantId === tenantId)
    return { data, total: data.length }
  }

  async listarMovimientos(_insumoId: string, _tenantId: string, _params: QueryParams): Promise<{ data: unknown[]; total: number }> {
    return { data: [], total: 0 }
  }
}
