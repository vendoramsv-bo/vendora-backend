import type {
  IPuntoVentaRepository,
  PuntoVentaData,
  CrearPuntoVentaDTO,
  ActualizarPuntoVentaDTO,
} from "../domain/ports/IPuntoVentaRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPuntoVentaData(raw: any): PuntoVentaData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    nombre: raw.nombre,
    tipo: raw.tipo,
    direccion: raw.direccion ?? null,
    telefono: raw.telefono ?? null,
    sucursal: raw.sucursal ?? null,
    estado: raw.estado,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
  }
}

export class PuntoVentaPrismaRepository implements IPuntoVentaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async crear(dto: CrearPuntoVentaDTO): Promise<PuntoVentaData> {
    const raw = await this.db.puntosDeVenta.create({
      data: {
        tenantId: dto.tenantId,
        nombre: dto.nombre,
        tipo: dto.tipo ?? "CAJA",
        direccion: dto.direccion ?? null,
        telefono: dto.telefono ?? null,
        sucursal: dto.sucursal ?? null,
        estado: "ACTIVO",
        createdById: dto.createdById ?? null,
      },
    })
    return toPuntoVentaData(raw)
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarPuntoVentaDTO): Promise<PuntoVentaData> {
    const raw = await this.db.puntosDeVenta.update({
      where: { id, tenantId },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.direccion !== undefined && { direccion: dto.direccion }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.sucursal !== undefined && { sucursal: dto.sucursal }),
        ...(dto.updatedById !== undefined && { updatedById: dto.updatedById }),
      },
    })
    return toPuntoVentaData(raw)
  }

  async cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<PuntoVentaData> {
    const raw = await this.db.puntosDeVenta.update({
      where: { id, tenantId },
      data: { estado, updatedById: updatedById ?? null },
    })
    return toPuntoVentaData(raw)
  }

  async obtener(id: string, tenantId: string): Promise<PuntoVentaData | null> {
    const raw = await this.db.puntosDeVenta.findFirst({ where: { id, tenantId } })
    return raw ? toPuntoVentaData(raw) : null
  }

  async listar(tenantId: string, params: QueryParams): Promise<{ data: PuntoVentaData[]; total: number }> {
    const args = toPrismaArgs(params, ["nombre"])
    const where = { ...args.where, tenantId }
    const [data, total] = await Promise.all([
      this.db.puntosDeVenta.findMany({ where, take: args.take, skip: args.skip, orderBy: args.orderBy }),
      this.db.puntosDeVenta.count({ where }),
    ])
    return { data: data.map(toPuntoVentaData), total }
  }

  async eliminar(id: string, tenantId: string): Promise<void> {
    await this.db.puntosDeVenta.delete({ where: { id, tenantId } })
  }

  async tieneMovimientos(id: string, tenantId: string): Promise<boolean> {
    const [ventas, aperturas] = await Promise.all([
      this.db.venta.count({ where: { puntoVentaId: id, tenantId } }),
      this.db.aperturaCierreDeCaja.count({ where: { puntoVentaId: id, tenantId } }),
    ])
    return ventas > 0 || aperturas > 0
  }
}
