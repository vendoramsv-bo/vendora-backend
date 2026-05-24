import type {
  IClienteRepository,
  ClienteData,
  CrearClienteDTO,
  ActualizarClienteDTO,
} from "../domain/ports/IClienteRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toClienteData(raw: any): ClienteData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    nombre: raw.nombre,
    email: raw.email ?? null,
    telefono: raw.telefono ?? null,
    direccion: raw.direccion ?? null,
    diaNacimiento: raw.diaNacimiento ?? null,
    mesNacimiento: raw.mesNacimiento ?? null,
    estado: raw.estado,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
  }
}

export class ClientePrismaRepository implements IClienteRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async obtenerPorId(id: string, tenantId: string): Promise<ClienteData | null> {
    const raw = await this.db.cliente.findFirst({ where: { id, tenantId } })
    return raw ? toClienteData(raw) : null
  }

  async obtenerPorNombre(nombre: string, tenantId: string): Promise<ClienteData | null> {
    const raw = await this.db.cliente.findFirst({ where: { nombre, tenantId } })
    return raw ? toClienteData(raw) : null
  }

  async obtenerPorEmail(email: string, tenantId: string): Promise<ClienteData | null> {
    const raw = await this.db.cliente.findFirst({ where: { email, tenantId } })
    return raw ? toClienteData(raw) : null
  }

  async crear(dto: CrearClienteDTO): Promise<ClienteData> {
    const raw = await this.db.cliente.create({
      data: {
        tenantId: dto.tenantId,
        nombre: dto.nombre,
        email: dto.email ?? null,
        telefono: dto.telefono ?? null,
        direccion: dto.direccion ?? null,
        diaNacimiento: dto.diaNacimiento ?? null,
        mesNacimiento: dto.mesNacimiento ?? null,
        estado: "ACTIVO",
        createdById: dto.createdById ?? null,
      },
    })
    return toClienteData(raw)
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarClienteDTO): Promise<ClienteData> {
    const raw = await this.db.cliente.update({
      where: { id, tenantId },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.direccion !== undefined && { direccion: dto.direccion }),
        ...(dto.diaNacimiento !== undefined && { diaNacimiento: dto.diaNacimiento }),
        ...(dto.mesNacimiento !== undefined && { mesNacimiento: dto.mesNacimiento }),
        ...(dto.updatedById !== undefined && { updatedById: dto.updatedById }),
      },
    })
    return toClienteData(raw)
  }

  async cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<ClienteData> {
    const raw = await this.db.cliente.update({
      where: { id, tenantId },
      data: { estado, updatedById: updatedById ?? null },
    })
    return toClienteData(raw)
  }

  async listar(tenantId: string, params: QueryParams, estado?: string): Promise<{ data: ClienteData[]; total: number }> {
    const args = toPrismaArgs(params, ["nombre"])
    const where = { ...args.where, tenantId, ...(estado && { estado }) }
    const [data, total] = await Promise.all([
      this.db.cliente.findMany({ where, take: args.take, skip: args.skip, orderBy: args.orderBy }),
      this.db.cliente.count({ where }),
    ])
    return { data: data.map(toClienteData), total }
  }
}
