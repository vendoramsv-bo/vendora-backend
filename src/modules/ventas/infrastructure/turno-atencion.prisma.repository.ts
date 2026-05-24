import type {
  ITurnoAtencionRepository,
  TurnoAtencionData,
  CrearTurnoAtencionDTO,
  ActualizarTurnoAtencionDTO,
} from "../domain/ports/ITurnoAtencionRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTurnoData(raw: any): TurnoAtencionData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    turno: raw.turno,
    descripcion: raw.descripcion ?? null,
    estado: raw.estado,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
  }
}

export class TurnoAtencionPrismaRepository implements ITurnoAtencionRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async crear(dto: CrearTurnoAtencionDTO): Promise<TurnoAtencionData> {
    const raw = await this.db.turnosDeAtencion.create({
      data: {
        tenantId: dto.tenantId,
        turno: dto.turno,
        descripcion: dto.descripcion ?? null,
        estado: "ACTIVO",
        createdById: dto.createdById ?? null,
      },
    })
    return toTurnoData(raw)
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarTurnoAtencionDTO): Promise<TurnoAtencionData> {
    const raw = await this.db.turnosDeAtencion.update({
      where: { id, tenantId },
      data: {
        ...(dto.turno !== undefined && { turno: dto.turno }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.updatedById !== undefined && { updatedById: dto.updatedById }),
      },
    })
    return toTurnoData(raw)
  }

  async cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<TurnoAtencionData> {
    const raw = await this.db.turnosDeAtencion.update({
      where: { id, tenantId },
      data: { estado, updatedById: updatedById ?? null },
    })
    return toTurnoData(raw)
  }

  async obtener(id: string, tenantId: string): Promise<TurnoAtencionData | null> {
    const raw = await this.db.turnosDeAtencion.findFirst({ where: { id, tenantId } })
    return raw ? toTurnoData(raw) : null
  }

  async listar(tenantId: string, params: QueryParams): Promise<{ data: TurnoAtencionData[]; total: number }> {
    const args = toPrismaArgs(params, ["turno"])
    const where = { ...args.where, tenantId }
    const [data, total] = await Promise.all([
      this.db.turnosDeAtencion.findMany({ where, take: args.take, skip: args.skip, orderBy: args.orderBy }),
      this.db.turnosDeAtencion.count({ where }),
    ])
    return { data: data.map(toTurnoData), total }
  }
}
