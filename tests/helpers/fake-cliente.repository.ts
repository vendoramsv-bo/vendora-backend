import type {
  IClienteRepository,
  ClienteData,
  CrearClienteDTO,
  ActualizarClienteDTO,
} from "../../src/modules/ventas/domain/ports/IClienteRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"

export class FakeClienteRepository implements IClienteRepository {
  private _clientes = new Map<string, ClienteData>()
  private _documentosPorCliente = new Map<string, number>()
  private _counter = 1

  /** `documentos`: ventas + reservas del cliente (spec 035). */
  seed(c: ClienteData, { documentos = 0 }: { documentos?: number } = {}): void {
    this._clientes.set(c.id, c)
    if (documentos > 0) this._documentosPorCliente.set(c.id, documentos)
  }

  async tieneDocumentos(id: string, _tenantId: string): Promise<boolean> {
    return (this._documentosPorCliente.get(id) ?? 0) > 0
  }

  async eliminar(id: string, tenantId: string): Promise<void> {
    const c = this._clientes.get(id)
    if (!c || c.tenantId !== tenantId) throw new Error(`Cliente ${id} no encontrado`)
    this._clientes.delete(id)
  }

  async obtenerPorId(id: string, tenantId: string): Promise<ClienteData | null> {
    const c = this._clientes.get(id)
    if (!c || c.tenantId !== tenantId) return null
    return c
  }

  async obtenerPorNombre(nombre: string, tenantId: string): Promise<ClienteData | null> {
    for (const c of this._clientes.values()) {
      if (c.nombre === nombre && c.tenantId === tenantId) return c
    }
    return null
  }

  async obtenerPorEmail(email: string, tenantId: string): Promise<ClienteData | null> {
    for (const c of this._clientes.values()) {
      if (c.email === email && c.tenantId === tenantId) return c
    }
    return null
  }

  async crear(dto: CrearClienteDTO): Promise<ClienteData> {
    const id = `cliente-${this._counter++}`
    const c: ClienteData = {
      id,
      tenantId: dto.tenantId,
      nombre: dto.nombre,
      email: dto.email ?? null,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
      diaNacimiento: dto.diaNacimiento ?? null,
      mesNacimiento: dto.mesNacimiento ?? null,
      estado: "ACTIVO",
      createdAt: new Date(),
      updatedAt: null,
      createdById: dto.createdById ?? null,
      updatedById: null,
    }
    this._clientes.set(id, c)
    return c
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarClienteDTO): Promise<ClienteData> {
    const c = this._clientes.get(id)
    if (!c || c.tenantId !== tenantId) throw new Error(`Cliente ${id} no encontrado`)
    const updated: ClienteData = {
      ...c,
      nombre: dto.nombre ?? c.nombre,
      email: dto.email !== undefined ? dto.email : c.email,
      telefono: dto.telefono !== undefined ? dto.telefono : c.telefono,
      direccion: dto.direccion !== undefined ? dto.direccion : c.direccion,
      diaNacimiento: dto.diaNacimiento !== undefined ? dto.diaNacimiento : c.diaNacimiento,
      mesNacimiento: dto.mesNacimiento !== undefined ? dto.mesNacimiento : c.mesNacimiento,
      updatedById: dto.updatedById ?? c.updatedById,
    }
    this._clientes.set(id, updated)
    return updated
  }

  async cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<ClienteData> {
    const c = this._clientes.get(id)
    if (!c || c.tenantId !== tenantId) throw new Error(`Cliente ${id} no encontrado`)
    const updated: ClienteData = { ...c, estado, updatedById: updatedById ?? c.updatedById }
    this._clientes.set(id, updated)
    return updated
  }

  async listar(tenantId: string, _params: QueryParams, estado?: string): Promise<{ data: ClienteData[]; total: number }> {
    let data = Array.from(this._clientes.values()).filter((c) => c.tenantId === tenantId)
    if (estado) data = data.filter((c) => c.estado === estado)
    return { data, total: data.length }
  }
}
