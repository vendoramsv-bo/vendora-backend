import type {
  IProveedorRepository,
  ProveedorData,
  CrearProveedorDTO,
  ActualizarProveedorDTO,
} from "../domain/ports/IProveedorRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProveedorData(raw: any): ProveedorData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    claProveedorId: raw.claProveedorId ?? null,
    nombre: raw.nombre,
    direccion: raw.direccion ?? null,
    telefono: raw.telefono ?? null,
    nit: raw.nit ?? null,
    departamento: raw.departamento ?? null,
    productosOfrece: raw.productosOfrece ?? null,
    sitioWeb: raw.sitioWeb ?? null,
    estado: raw.estado,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
  }
}

export class ProveedorPrismaRepository implements IProveedorRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async obtenerPorId(id: string, tenantId: string): Promise<ProveedorData | null> {
    const raw = await this.db.proveedor.findFirst({ where: { id, tenantId } })
    return raw ? toProveedorData(raw) : null
  }

  async obtenerPorNombre(nombre: string, tenantId: string): Promise<ProveedorData | null> {
    const raw = await this.db.proveedor.findFirst({ where: { nombre, tenantId } })
    return raw ? toProveedorData(raw) : null
  }

  async obtenerPorNit(nit: string, tenantId: string): Promise<ProveedorData | null> {
    const raw = await this.db.proveedor.findFirst({ where: { nit, tenantId } })
    return raw ? toProveedorData(raw) : null
  }

  async crear(dto: CrearProveedorDTO): Promise<ProveedorData> {
    const raw = await this.db.proveedor.create({
      data: {
        tenantId: dto.tenantId,
        nombre: dto.nombre,
        nit: dto.nit ?? null,
        telefono: dto.telefono ?? null,
        direccion: dto.direccion ?? null,
        departamento: dto.departamento ?? null,
        sitioWeb: dto.sitioWeb ?? null,
        productosOfrece: dto.productosOfrece ?? null,
        estado: "ACTIVO",
        createdById: dto.createdById ?? null,
      },
    })
    return toProveedorData(raw)
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarProveedorDTO): Promise<ProveedorData> {
    const raw = await this.db.proveedor.update({
      where: { id, tenantId },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.nit !== undefined && { nit: dto.nit }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.direccion !== undefined && { direccion: dto.direccion }),
        ...(dto.departamento !== undefined && { departamento: dto.departamento }),
        ...(dto.sitioWeb !== undefined && { sitioWeb: dto.sitioWeb }),
        ...(dto.productosOfrece !== undefined && { productosOfrece: dto.productosOfrece }),
        ...(dto.updatedById !== undefined && { updatedById: dto.updatedById }),
      },
    })
    return toProveedorData(raw)
  }

  async cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<ProveedorData> {
    const raw = await this.db.proveedor.update({
      where: { id, tenantId },
      data: { estado, updatedById: updatedById ?? null },
    })
    return toProveedorData(raw)
  }

  async eliminar(id: string, tenantId: string): Promise<void> {
    await this.db.proveedor.delete({ where: { id, tenantId } })
  }

  async tieneCompras(id: string, tenantId: string): Promise<boolean> {
    const count = await this.db.compra.count({ where: { proveedorId: id, tenantId } })
    return count > 0
  }

  async listar(tenantId: string, params: QueryParams, estado?: string): Promise<{ data: ProveedorData[]; total: number }> {
    const args = toPrismaArgs(params, ["nombre"])
    const where = { ...args.where, tenantId, ...(estado && { estado }) }
    const [data, total] = await Promise.all([
      this.db.proveedor.findMany({ where, take: args.take, skip: args.skip, orderBy: args.orderBy }),
      this.db.proveedor.count({ where }),
    ])
    return { data: data.map(toProveedorData), total }
  }
}
