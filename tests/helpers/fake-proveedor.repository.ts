import type {
  IProveedorRepository,
  ProveedorData,
  CrearProveedorDTO,
  ActualizarProveedorDTO,
} from "../../src/modules/ventas/domain/ports/IProveedorRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"

export class FakeProveedorRepository implements IProveedorRepository {
  private _proveedores = new Map<string, ProveedorData>()
  private _comprasPorProveedor = new Map<string, number>()
  private _counter = 1

  seed(p: ProveedorData, compras = 0): void {
    this._proveedores.set(p.id, p)
    if (compras > 0) this._comprasPorProveedor.set(p.id, compras)
  }

  async obtenerPorId(id: string, tenantId: string): Promise<ProveedorData | null> {
    const p = this._proveedores.get(id)
    if (!p || p.tenantId !== tenantId) return null
    return p
  }

  async obtenerPorNombre(nombre: string, tenantId: string): Promise<ProveedorData | null> {
    for (const p of this._proveedores.values()) {
      if (p.nombre === nombre && p.tenantId === tenantId) return p
    }
    return null
  }

  async obtenerPorNit(nit: string, tenantId: string): Promise<ProveedorData | null> {
    for (const p of this._proveedores.values()) {
      if (p.nit === nit && p.tenantId === tenantId) return p
    }
    return null
  }

  async crear(dto: CrearProveedorDTO): Promise<ProveedorData> {
    const id = `proveedor-${this._counter++}`
    const p: ProveedorData = {
      id,
      tenantId: dto.tenantId,
      claProveedorId: null,
      nombre: dto.nombre,
      nit: dto.nit ?? null,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
      departamento: dto.departamento ?? null,
      sitioWeb: dto.sitioWeb ?? null,
      productosOfrece: dto.productosOfrece ?? null,
      estado: "ACTIVO",
      createdAt: new Date(),
      updatedAt: null,
      createdById: dto.createdById ?? null,
      updatedById: null,
    }
    this._proveedores.set(id, p)
    return p
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarProveedorDTO): Promise<ProveedorData> {
    const p = this._proveedores.get(id)
    if (!p || p.tenantId !== tenantId) throw new Error(`Proveedor ${id} no encontrado`)
    const updated: ProveedorData = {
      ...p,
      nombre: dto.nombre ?? p.nombre,
      nit: dto.nit !== undefined ? dto.nit : p.nit,
      telefono: dto.telefono !== undefined ? dto.telefono : p.telefono,
      direccion: dto.direccion !== undefined ? dto.direccion : p.direccion,
      departamento: dto.departamento !== undefined ? dto.departamento : p.departamento,
      sitioWeb: dto.sitioWeb !== undefined ? dto.sitioWeb : p.sitioWeb,
      productosOfrece: dto.productosOfrece !== undefined ? dto.productosOfrece : p.productosOfrece,
      updatedById: dto.updatedById ?? p.updatedById,
    }
    this._proveedores.set(id, updated)
    return updated
  }

  async cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<ProveedorData> {
    const p = this._proveedores.get(id)
    if (!p || p.tenantId !== tenantId) throw new Error(`Proveedor ${id} no encontrado`)
    const updated: ProveedorData = { ...p, estado, updatedById: updatedById ?? p.updatedById }
    this._proveedores.set(id, updated)
    return updated
  }

  async eliminar(id: string, tenantId: string): Promise<void> {
    const p = this._proveedores.get(id)
    if (!p || p.tenantId !== tenantId) throw new Error(`Proveedor ${id} no encontrado`)
    this._proveedores.delete(id)
  }

  async tieneCompras(id: string, _tenantId: string): Promise<boolean> {
    return (this._comprasPorProveedor.get(id) ?? 0) > 0
  }

  async listar(tenantId: string, _params: QueryParams, estado?: string): Promise<{ data: ProveedorData[]; total: number }> {
    let data = Array.from(this._proveedores.values()).filter((p) => p.tenantId === tenantId)
    if (estado) data = data.filter((p) => p.estado === estado)
    return { data, total: data.length }
  }
}
