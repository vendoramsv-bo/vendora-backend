import type {
  IInsumoRepository,
  InsumoData,
  CrearInsumoDTO,
  ActualizarInsumoDTO,
  AjusteInsumoDTO,
  AjusteInsumoResultado,
} from "../domain/ports/IInsumoRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

function toInsumoData(raw: any): InsumoData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    nombre: raw.nombre,
    unidadMedidaId: raw.unidadMedidaId,
    cantidadStock: Number(raw.cantidadStock),
    stockMinimo: raw.stockMinimo,
    costoUnitario: Number(raw.costoUnitario),
    fechaVencimiento: raw.fechaVencimiento ?? null,
    estado: raw.estado,
    createdAt: raw.createdAt,
  }
}

export class InsumosPrismaRepository implements IInsumoRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async findById(id: string, tenantId: string): Promise<InsumoData | null> {
    const raw = await this.db.insumo.findFirst({ where: { id, tenantId } })
    return raw ? toInsumoData(raw) : null
  }

  async findByNombre(nombre: string, tenantId: string): Promise<InsumoData | null> {
    const raw = await this.db.insumo.findFirst({ where: { nombre, tenantId } })
    return raw ? toInsumoData(raw) : null
  }

  async create(dto: CrearInsumoDTO): Promise<InsumoData> {
    const raw = await this.db.$transaction(async (tx: any) => {
      const insumo = await tx.insumo.create({
        data: {
          tenantId: dto.tenantId,
          nombre: dto.nombre,
          unidadMedidaId: dto.unidadMedidaId,
          cantidadStock: 0,
          stockMinimo: dto.stockMinimo ?? 0,
          costoUnitario: dto.costoUnitario ?? 0,
          fechaVencimiento: dto.fechaVencimiento ?? null,
          estado: "ACTIVO",
          createdById: dto.createdById ?? null,
        },
      })
      await tx.movimientoAlmacen.create({
        data: {
          tenantId: dto.tenantId,
          insumoId: insumo.id,
          tipo: "CREACION",
          cantidad: 0,
          motivo: "Creación de insumo",
          stockAntes: 0,
          stockDespues: 0,
          createdById: dto.createdById ?? null,
        },
      })
      return insumo
    })
    return toInsumoData(raw)
  }

  async update(id: string, tenantId: string, dto: ActualizarInsumoDTO): Promise<InsumoData> {
    const raw = await this.db.insumo.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.unidadMedidaId !== undefined && { unidadMedidaId: dto.unidadMedidaId }),
        ...(dto.stockMinimo !== undefined && { stockMinimo: dto.stockMinimo }),
        ...(dto.costoUnitario !== undefined && { costoUnitario: dto.costoUnitario }),
        ...(dto.fechaVencimiento !== undefined && { fechaVencimiento: dto.fechaVencimiento }),
        updatedById: dto.updatedById ?? null,
      },
    })
    return toInsumoData(raw)
  }

  async delete(id: string, _tenantId: string): Promise<void> {
    await this.db.insumo.delete({ where: { id } })
  }

  async cambiarEstado(id: string, _tenantId: string, estado: string, updatedById?: string): Promise<InsumoData> {
    const raw = await this.db.insumo.update({
      where: { id },
      data: { estado, updatedById: updatedById ?? null },
    })
    return toInsumoData(raw)
  }

  async registrarAjuste(dto: AjusteInsumoDTO): Promise<AjusteInsumoResultado> {
    const insumo = await this.db.insumo.findFirst({ where: { id: dto.insumoId, tenantId: dto.tenantId } })
    const stockAntes = Number(insumo.cantidadStock)
    const stockDespues = stockAntes + dto.cantidadAjuste

    await this.db.$transaction([
      this.db.insumo.update({
        where: { id: dto.insumoId },
        data: { cantidadStock: stockDespues },
      }),
      this.db.movimientoAlmacen.create({
        data: {
          tenantId: dto.tenantId,
          insumoId: dto.insumoId,
          tipo: "AJUSTE",
          cantidad: dto.cantidadAjuste,
          motivo: dto.motivo,
          stockAntes,
          stockDespues,
          createdById: dto.createdById ?? null,
        },
      }),
    ])

    return {
      insumoId: dto.insumoId,
      insumoNombre: insumo.nombre as string,
      stockAntes,
      stockDespues,
      stockMinimo: insumo.stockMinimo as number,
    }
  }

  async listar(tenantId: string, params: QueryParams, stockCritico?: boolean) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["nombre"])
    const where: any = { tenantId, ...whereSearch }
    if (stockCritico) {
      // cantidadStock < stockMinimo — Prisma no soporta comparación entre campos directamente,
      // así que filtramos en JS (aceptable a la escala del módulo)
    }
    const [data, total] = await Promise.all([
      this.db.insumo.findMany({ where, take, skip, orderBy, include: { unidadMedida: true } }),
      this.db.insumo.count({ where }),
    ])
    // Filtro post-query para stockCritico (comparación de campos)
    const filtered = stockCritico
      ? data.filter((i: any) => Number(i.cantidadStock) < i.stockMinimo)
      : data
    return { data: filtered, total: stockCritico ? filtered.length : total }
  }

  async listarMovimientos(insumoId: string, tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["motivo"])
    const where = { insumoId, tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.movimientoAlmacen.findMany({ where, take, skip, orderBy }),
      this.db.movimientoAlmacen.count({ where }),
    ])
    return { data, total }
  }
}
