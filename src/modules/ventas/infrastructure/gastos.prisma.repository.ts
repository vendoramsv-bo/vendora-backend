import type {
  IGastosRepository,
  GastoData,
  CrearGastoDTO,
  ActualizarGastoDTO,
} from "../domain/ports/IGastosRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGastoData(raw: any): GastoData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    tenantMemberId: raw.tenantMemberId ?? null,
    fecha: raw.fecha,
    motivo: raw.motivo,
    totalGasto: Number(raw.totalGasto),
    estado: raw.estado,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
  }
}

export class GastosPrismaRepository implements IGastosRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async crear(dto: CrearGastoDTO): Promise<GastoData> {
    const raw = await this.db.gastos.create({
      data: {
        tenantId: dto.tenantId,
        tenantMemberId: dto.tenantMemberId ?? null,
        fecha: dto.fecha,
        motivo: dto.motivo,
        totalGasto: dto.totalGasto,
        estado: "ACTIVO",
        createdById: dto.createdById ?? null,
      },
    })
    return toGastoData(raw)
  }

  async obtener(id: string, tenantId: string): Promise<GastoData | null> {
    const raw = await this.db.gastos.findFirst({ where: { id, tenantId } })
    return raw ? toGastoData(raw) : null
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarGastoDTO): Promise<GastoData> {
    const raw = await this.db.gastos.update({
      where: { id, tenantId },
      data: {
        ...(dto.fecha !== undefined && { fecha: dto.fecha }),
        ...(dto.motivo !== undefined && { motivo: dto.motivo }),
        ...(dto.totalGasto !== undefined && { totalGasto: dto.totalGasto }),
        ...(dto.updatedById !== undefined && { updatedById: dto.updatedById }),
      },
    })
    return toGastoData(raw)
  }

  async eliminar(id: string, tenantId: string, updatedById?: string | null): Promise<void> {
    await this.db.gastos.update({
      where: { id, tenantId },
      data: { estado: "ELIMINADO", updatedById: updatedById ?? null },
    })
  }

  async listar(
    tenantId: string,
    params: QueryParams,
    incluirEliminados = false,
  ): Promise<{ data: GastoData[]; total: number }> {
    const args = toPrismaArgs(params)
    const where = {
      ...args.where,
      tenantId,
      ...(!incluirEliminados && { estado: { not: "ELIMINADO" } }),
    }
    const [data, total] = await Promise.all([
      this.db.gastos.findMany({ where, take: args.take, skip: args.skip, orderBy: args.orderBy }),
      this.db.gastos.count({ where }),
    ])
    return { data: data.map(toGastoData), total }
  }
}
