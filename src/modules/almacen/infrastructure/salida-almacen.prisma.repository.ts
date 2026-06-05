import type {
  ISalidaAlmacenRepository,
  CrearSalidaDTO,
  ActualizarSalidaDTO,
  AprobarSalidaDTO,
  SalidaDoc,
  SalidaResultado,
} from "../domain/ports/ISalidaAlmacenRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import {
  ConflictoVersionError,
  DocumentoNoEncontradoError,
  DocumentoYaAprobadoError,
  StockNegativoInsumoError,
} from "../domain/almacen.errors.js"

export class SalidaAlmacenPrismaRepository implements ISalidaAlmacenRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async create(dto: CrearSalidaDTO) {
    const salida = await this.db.salidaAlmacen.create({
      data: {
        tenantId: dto.tenantId,
        motivo: dto.motivo ?? null,
        descripcion: dto.descripcion ?? null,
        tenantMemberId: dto.tenantMemberId ?? null,
        createdById: dto.createdById ?? null,
        estado: "PENDIENTE",
        version: 0,
        detalles: {
          create: dto.detalles.map((d) => ({
            insumoId: d.insumoId,
            cantidad: d.cantidad,
          })),
        },
      },
      include: { detalles: true },
    })
    return {
      salidaId: salida.id,
      estado: salida.estado,
      version: salida.version,
      detalles: salida.detalles,
    }
  }

  async obtenerSalida(id: string, tenantId: string): Promise<SalidaDoc | null> {
    const raw = await this.db.salidaAlmacen.findFirst({
      where: { id, tenantId },
      include: { detalles: true },
    })
    if (!raw) return null
    return {
      id: raw.id,
      tenantId: raw.tenantId,
      motivo: raw.motivo,
      descripcion: raw.descripcion,
      estado: raw.estado,
      version: raw.version,
      detalles: raw.detalles.map((d: any) => ({
        insumoId: d.insumoId,
        cantidad: Number(d.cantidad),
      })),
    }
  }

  async actualizarSalida(id: string, tenantId: string, dto: ActualizarSalidaDTO): Promise<SalidaDoc> {
    const existing = await this.db.salidaAlmacen.findFirst({ where: { id, tenantId } })
    if (!existing) throw new DocumentoNoEncontradoError("SALIDA", id)
    if (existing.estado === "APROBADO") throw new DocumentoYaAprobadoError("salida")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { updatedById: dto.updatedById ?? null }
    if (dto.motivo !== undefined) updateData.motivo = dto.motivo
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion
    if (dto.detalles !== undefined) {
      updateData.detalles = {
        deleteMany: {},
        create: dto.detalles.map((d) => ({
          insumoId: d.insumoId,
          cantidad: d.cantidad,
        })),
      }
    }

    const updated = await this.db.salidaAlmacen.update({
      where: { id },
      data: updateData,
      include: { detalles: true },
    })
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      motivo: updated.motivo,
      descripcion: updated.descripcion,
      estado: updated.estado,
      version: updated.version,
      detalles: updated.detalles.map((d: any) => ({
        insumoId: d.insumoId,
        cantidad: Number(d.cantidad),
      })),
    }
  }

  async aprobarSalida(dto: AprobarSalidaDTO): Promise<SalidaResultado> {
    const salida = await this.db.salidaAlmacen.findFirst({
      where: { id: dto.salidaId, tenantId: dto.tenantId },
      include: { detalles: { include: { insumo: true } } },
    })
    if (!salida) throw new DocumentoNoEncontradoError("SALIDA", dto.salidaId)
    if (salida.estado === "APROBADO") throw new DocumentoYaAprobadoError("salida")
    if (salida.version !== dto.version) throw new ConflictoVersionError()

    // Pre-check: ningún stock resultante negativo
    for (const d of salida.detalles) {
      const stockActual = Number(d.insumo.cantidadStock)
      const cantidad = Number(d.cantidad)
      const stockResultante = stockActual - cantidad
      if (stockResultante < 0) {
        throw new StockNegativoInsumoError(d.insumoId, stockResultante)
      }
    }

    const resultadoDetalles: SalidaResultado["detalles"] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      for (const d of salida.detalles) {
        const insumo = d.insumo
        const stockAntes = Number(insumo.cantidadStock)
        const cantidad = Number(d.cantidad)
        const stockDespues = stockAntes - cantidad

        await tx.insumo.update({
          where: { id: d.insumoId },
          data: { cantidadStock: stockDespues },
        })

        await tx.movimientoAlmacen.upsert({
          where: {
            tenantId_insumoId_tipo_referenciaId: {
              tenantId: dto.tenantId,
              insumoId: d.insumoId,
              tipo: "SALIDA",
              referenciaId: dto.salidaId,
            },
          },
          create: {
            tenantId: dto.tenantId,
            insumoId: d.insumoId,
            tipo: "SALIDA",
            cantidad,
            motivo: salida.motivo ?? salida.descripcion ?? null,
            referenciaId: dto.salidaId,
            stockAntes,
            stockDespues,
            createdById: dto.aprobadoPorId ?? null,
          },
          update: {
            cantidad,
            stockAntes,
            stockDespues,
          },
        })

        resultadoDetalles.push({
          insumoId: d.insumoId,
          insumoNombre: insumo.nombre,
          cantidad,
          stockAntes,
          stockDespues,
          stockMinimo: Number(insumo.stockMinimo),
        })
      }

      await tx.salidaAlmacen.update({
        where: { id: dto.salidaId },
        data: { estado: "APROBADO", version: salida.version + 1, updatedById: dto.aprobadoPorId ?? null },
      })
    })

    return {
      salidaId: dto.salidaId,
      estado: "APROBADO",
      version: salida.version + 1,
      detalles: resultadoDetalles,
    }
  }

  async findById(id: string, tenantId: string) {
    return this.db.salidaAlmacen.findFirst({
      where: { id, tenantId },
      include: { detalles: true },
    })
  }

  async listar(tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["descripcion"])
    const where = { tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.salidaAlmacen.findMany({ where, take, skip, orderBy, include: { detalles: true } }),
      this.db.salidaAlmacen.count({ where }),
    ])
    return { data, total }
  }
}
