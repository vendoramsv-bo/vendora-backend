import type {
  IRecuentoAlmacenRepository,
  RegistrarRecuentoAlmacenDTO,
  ActualizarRecuentoAlmacenDTO,
  AprobarRecuentoAlmacenDTO,
  AprobarRecuentoAlmacenResultado,
  CambioStockRecuento,
  RecuentoAlmacenDetalleDTO,
  RecuentoAlmacenDoc,
} from "../domain/ports/IRecuentoAlmacenRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import {
  ConflictoVersionError,
  DocumentoNoEncontradoError,
  DocumentoYaAprobadoError,
  InsumoNoEncontradoError,
} from "../domain/almacen.errors.js"

const INCLUDE_DOC = {
  recuentosAlmacenDetalle: { include: { insumo: { include: { unidadMedida: true } } } },
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDoc(raw: any): RecuentoAlmacenDoc {
  return {
    id: raw.id,
    fecha: raw.fecha,
    observacion: raw.observacion ?? null,
    estado: raw.estado,
    version: raw.version ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detalles: (raw.recuentosAlmacenDetalle ?? []).map((d: any) => ({
      insumoId: d.insumoId,
      insumoNombre: d.insumo?.nombre ?? "",
      unidad: d.insumo?.unidadMedida?.sigla ?? "",
      stockSistema: Number(d.stockSistema),
      stockFisico: Number(d.stockFisico),
      diferencia: Number(d.diferencia),
    })),
  }
}

/**
 * Recuentos de almacén (spec 033, B-05): registrar deja el recuento pendiente; aprobar
 * fija el stock en lo contado y escribe un movimiento RECUENTO por línea, en una
 * transacción — la misma lógica que `aprobarRecuento` de inventario.
 */
export class RecuentoAlmacenPrismaRepository implements IRecuentoAlmacenRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  /** Las líneas con la foto del stock vigente de cada insumo del tenant. */
  private async lineasConFoto(tenantId: string, detalles: RecuentoAlmacenDetalleDTO[]) {
    return Promise.all(
      detalles.map(async (d) => {
        const ins = await this.db.insumo.findFirst({ where: { id: d.insumoId, tenantId } })
        if (!ins) throw new InsumoNoEncontradoError(d.insumoId)
        const stockSistema = Number(ins.cantidadStock)
        return {
          insumoId: d.insumoId,
          stockSistema,
          stockFisico: d.stockFisico,
          diferencia: d.stockFisico - stockSistema,
        }
      }),
    )
  }

  async create(dto: RegistrarRecuentoAlmacenDTO): Promise<RecuentoAlmacenDoc> {
    const lineas = await this.lineasConFoto(dto.tenantId, dto.detalles)
    const raw = await this.db.recuentoAlmacen.create({
      data: {
        tenantId: dto.tenantId,
        observacion: dto.observacion ?? null,
        // Sin fecha declarada, la base pone ahora (`@default(now())`).
        ...(dto.fecha ? { fecha: dto.fecha } : {}),
        tenantMemberId: dto.tenantMemberId ?? null,
        createdById: dto.createdById ?? null,
        estado: "PENDIENTE",
        version: 0,
        recuentosAlmacenDetalle: { create: lineas },
      },
      include: INCLUDE_DOC,
    })
    return mapDoc(raw)
  }

  async obtener(id: string, tenantId: string): Promise<RecuentoAlmacenDoc | null> {
    const raw = await this.db.recuentoAlmacen.findFirst({ where: { id, tenantId }, include: INCLUDE_DOC })
    return raw ? mapDoc(raw) : null
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarRecuentoAlmacenDTO): Promise<RecuentoAlmacenDoc> {
    const existing = await this.db.recuentoAlmacen.findFirst({ where: { id, tenantId } })
    if (!existing) throw new DocumentoNoEncontradoError("RECUENTO_ALMACEN", id)
    if (existing.estado === "APROBADO") throw new DocumentoYaAprobadoError("recuento")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { updatedById: dto.updatedById ?? null }
    if (dto.observacion !== undefined) data.observacion = dto.observacion
    if (dto.fecha !== undefined) data.fecha = dto.fecha
    if (dto.detalles !== undefined) {
      data.recuentosAlmacenDetalle = { deleteMany: {}, create: await this.lineasConFoto(tenantId, dto.detalles) }
    }
    const raw = await this.db.recuentoAlmacen.update({ where: { id }, data, include: INCLUDE_DOC })
    return mapDoc(raw)
  }

  async eliminar(id: string, tenantId: string): Promise<void> {
    const existing = await this.db.recuentoAlmacen.findFirst({ where: { id, tenantId } })
    if (!existing) throw new DocumentoNoEncontradoError("RECUENTO_ALMACEN", id)
    if (existing.estado === "APROBADO") throw new DocumentoYaAprobadoError("recuento")
    // Las líneas se borran en cascada (RecuentoAlmacenDetalle onDelete: Cascade).
    await this.db.recuentoAlmacen.delete({ where: { id } })
  }

  async aprobar(dto: AprobarRecuentoAlmacenDTO): Promise<AprobarRecuentoAlmacenResultado> {
    const recuento = await this.db.recuentoAlmacen.findFirst({
      where: { id: dto.recuentoId, tenantId: dto.tenantId },
      include: { recuentosAlmacenDetalle: { include: { insumo: true } } },
    })
    if (!recuento) throw new DocumentoNoEncontradoError("RECUENTO_ALMACEN", dto.recuentoId)
    if (recuento.estado === "APROBADO") throw new DocumentoYaAprobadoError("recuento")
    if ((recuento.version ?? 0) !== dto.version) throw new ConflictoVersionError()

    const cambios: CambioStockRecuento[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      for (const d of recuento.recuentosAlmacenDetalle) {
        // El stock vigente al aprobar, no la foto del registro: entre medio pudo cambiar.
        const actual = await tx.insumo.findFirst({ where: { id: d.insumoId, tenantId: dto.tenantId } })
        if (!actual) throw new InsumoNoEncontradoError(d.insumoId)
        const stockAntes = Number(actual.cantidadStock)
        const stockDespues = Number(d.stockFisico)
        const diferencia = stockDespues - stockAntes

        await tx.movimientoAlmacen.upsert({
          where: {
            tenantId_insumoId_tipo_referenciaId: {
              tenantId: dto.tenantId,
              insumoId: d.insumoId,
              tipo: "RECUENTO",
              referenciaId: dto.recuentoId,
            },
          },
          create: {
            tenantId: dto.tenantId,
            insumoId: d.insumoId,
            tipo: "RECUENTO",
            cantidad: diferencia,
            motivo: recuento.observacion ?? null,
            referenciaId: dto.recuentoId,
            stockAntes,
            stockDespues,
            createdById: dto.aprobadoPorId ?? null,
          },
          update: { cantidad: diferencia, stockAntes, stockDespues },
        })
        await tx.insumo.update({ where: { id: d.insumoId }, data: { cantidadStock: stockDespues } })
        // La línea queda con lo que realmente había al aprobar.
        await tx.recuentoAlmacenDetalle.update({
          where: { id: d.id },
          data: { stockSistema: stockAntes, diferencia },
        })
        cambios.push({
          insumoId: d.insumoId,
          insumoNombre: actual.nombre,
          stockAntes,
          stockDespues,
          stockMinimo: Number(actual.stockMinimo),
        })
      }
      await tx.recuentoAlmacen.update({
        where: { id: dto.recuentoId },
        data: { estado: "APROBADO", version: (recuento.version ?? 0) + 1, updatedById: dto.aprobadoPorId ?? null },
      })
    })

    const doc = await this.obtener(dto.recuentoId, dto.tenantId)
    return { doc: doc!, cambios }
  }

  async findById(id: string, tenantId: string) {
    return this.db.recuentoAlmacen.findFirst({
      where: { id, tenantId },
      include: { recuentosAlmacenDetalle: true },
    })
  }

  async listar(tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["observacion"])
    const where = { tenantId, ...whereSearch }
    const [filas, total] = await Promise.all([
      this.db.recuentoAlmacen.findMany({
        where,
        take,
        skip,
        orderBy,
        include: { _count: { select: { recuentosAlmacenDetalle: true } } },
      }),
      this.db.recuentoAlmacen.count({ where }),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = filas.map(({ _count, ...r }: any) => ({ ...r, cantidadLineas: _count?.recuentosAlmacenDetalle ?? 0 }))
    return { data, total }
  }
}
