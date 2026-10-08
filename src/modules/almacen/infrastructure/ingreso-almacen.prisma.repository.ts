import type {
  IIngresoAlmacenRepository,
  CrearIngresoDTO,
  ActualizarIngresoDTO,
  AprobarIngresoDTO,
  IngresoDoc,
  IngresoResultado,
} from "../domain/ports/IIngresoAlmacenRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import {
  ConflictoVersionError,
  DocumentoNoEncontradoError,
  DocumentoYaAprobadoError,
} from "../domain/almacen.errors.js"

/**
 * Lo que el detalle necesita: el proveedor y, por línea, el nombre, la unidad y el stock
 * del insumo, para que el formulario muestre cada línea sin otra consulta (spec 033).
 */
const INCLUDE_DOC = {
  proveedor: { select: { id: true, nombre: true } },
  detalles: { include: { insumo: { include: { unidadMedida: true } } } },
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIngresoDoc(raw: any): IngresoDoc {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    proveedorId: raw.proveedorId,
    proveedor: raw.proveedor ? { id: raw.proveedor.id, nombre: raw.proveedor.nombre } : null,
    fecha: raw.fecha,
    descripcion: raw.descripcion,
    estado: raw.estado,
    version: raw.version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detalles: (raw.detalles ?? []).map((d: any) => ({
      insumoId: d.insumoId,
      insumoNombre: d.insumo?.nombre ?? "",
      unidad: d.insumo?.unidadMedida?.sigla ?? "",
      stockActual: Number(d.insumo?.cantidadStock ?? 0),
      cantidad: Number(d.cantidad),
      costoUnitario: Number(d.costoUnitario),
      lote: d.lote,
      fechaVencimiento: d.fechaVencimiento,
      observaciones: d.observaciones,
    })),
  }
}

export class IngresoAlmacenPrismaRepository implements IIngresoAlmacenRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async create(dto: CrearIngresoDTO) {
    const ingreso = await this.db.ingresoAlmacen.create({
      data: {
        tenantId: dto.tenantId,
        proveedorId: dto.proveedorId,
        descripcion: dto.descripcion ?? null,
        // Sin fecha declarada, la base pone ahora (`@default(now())`).
        ...(dto.fecha ? { fecha: dto.fecha } : {}),
        tenantMemberId: dto.tenantMemberId ?? null,
        createdById: dto.createdById ?? null,
        totalCantidad: dto.detalles.reduce((s, d) => s + d.cantidad, 0),
        totalIngreso: dto.detalles.reduce((s, d) => s + d.cantidad * (d.costoUnitario ?? 0), 0),
        estado: "PENDIENTE",
        version: 0,
        detalles: {
          create: dto.detalles.map((d) => ({
            insumoId: d.insumoId,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario ?? 0,
            costoTotal: d.cantidad * (d.costoUnitario ?? 0),
            lote: d.lote ?? null,
            fechaVencimiento: d.fechaVencimiento ?? null,
            observaciones: d.observaciones ?? null,
          })),
        },
      },
      include: { detalles: true },
    })
    return {
      ingresoId: ingreso.id,
      estado: ingreso.estado,
      version: ingreso.version,
      detalles: ingreso.detalles,
    }
  }

  async obtenerIngreso(id: string, tenantId: string): Promise<IngresoDoc | null> {
    const raw = await this.db.ingresoAlmacen.findFirst({
      where: { id, tenantId },
      include: INCLUDE_DOC,
    })
    return raw ? mapIngresoDoc(raw) : null
  }

  async actualizarIngreso(id: string, tenantId: string, dto: ActualizarIngresoDTO): Promise<IngresoDoc> {
    const existing = await this.db.ingresoAlmacen.findFirst({ where: { id, tenantId } })
    if (!existing) throw new DocumentoNoEncontradoError("INGRESO", id)
    if (existing.estado === "APROBADO") throw new DocumentoYaAprobadoError("ingreso")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { updatedById: dto.updatedById ?? null }
    if (dto.proveedorId !== undefined) updateData.proveedorId = dto.proveedorId
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion
    if (dto.fecha !== undefined) updateData.fecha = dto.fecha
    if (dto.detalles !== undefined) {
      updateData.totalCantidad = dto.detalles.reduce((s, d) => s + d.cantidad, 0)
      updateData.totalIngreso = dto.detalles.reduce((s, d) => s + d.cantidad * (d.costoUnitario ?? 0), 0)
      updateData.detalles = {
        deleteMany: {},
        create: dto.detalles.map((d) => ({
          insumoId: d.insumoId,
          cantidad: d.cantidad,
          costoUnitario: d.costoUnitario ?? 0,
          costoTotal: d.cantidad * (d.costoUnitario ?? 0),
          lote: d.lote ?? null,
          fechaVencimiento: d.fechaVencimiento ?? null,
          observaciones: d.observaciones ?? null,
        })),
      }
    }

    const updated = await this.db.ingresoAlmacen.update({
      where: { id },
      data: updateData,
      include: INCLUDE_DOC,
    })
    return mapIngresoDoc(updated)
  }

  async aprobarIngreso(dto: AprobarIngresoDTO): Promise<IngresoResultado> {
    const ingreso = await this.db.ingresoAlmacen.findFirst({
      where: { id: dto.ingresoId, tenantId: dto.tenantId },
      include: { detalles: { include: { insumo: true } } },
    })
    if (!ingreso) throw new DocumentoNoEncontradoError("INGRESO", dto.ingresoId)
    if (ingreso.estado === "APROBADO") throw new DocumentoYaAprobadoError("ingreso")
    if (ingreso.version !== dto.version) throw new ConflictoVersionError()

    const resultadoDetalles: IngresoResultado["detalles"] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.$transaction(async (tx: any) => {
      for (const d of ingreso.detalles) {
        const insumo = d.insumo
        const stockAntes = Number(insumo.cantidadStock)
        const cantidad = Number(d.cantidad)
        const stockDespues = stockAntes + cantidad

        await tx.insumo.update({
          where: { id: d.insumoId },
          data: { cantidadStock: stockDespues },
        })

        await tx.movimientoAlmacen.upsert({
          where: {
            tenantId_insumoId_tipo_referenciaId: {
              tenantId: dto.tenantId,
              insumoId: d.insumoId,
              tipo: "INGRESO",
              referenciaId: dto.ingresoId,
            },
          },
          create: {
            tenantId: dto.tenantId,
            insumoId: d.insumoId,
            tipo: "INGRESO",
            cantidad,
            motivo: ingreso.descripcion ?? null,
            referenciaId: dto.ingresoId,
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

      await tx.ingresoAlmacen.update({
        where: { id: dto.ingresoId },
        data: { estado: "APROBADO", version: ingreso.version + 1, updatedById: dto.aprobadoPorId ?? null },
      })
    })

    return {
      ingresoId: dto.ingresoId,
      estado: "APROBADO",
      version: ingreso.version + 1,
      detalles: resultadoDetalles,
    }
  }

  async eliminarIngreso(id: string, tenantId: string): Promise<void> {
    const existing = await this.db.ingresoAlmacen.findFirst({ where: { id, tenantId } })
    if (!existing) throw new DocumentoNoEncontradoError("INGRESO", id)
    if (existing.estado === "APROBADO") throw new DocumentoYaAprobadoError("ingreso")
    // Las líneas se borran en cascada (detalle onDelete: Cascade).
    await this.db.ingresoAlmacen.delete({ where: { id } })
  }

  async findById(id: string, tenantId: string) {
    return this.db.ingresoAlmacen.findFirst({
      where: { id, tenantId },
      include: { detalles: true, proveedor: true },
    })
  }

  async listar(tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["descripcion"])
    const where = { tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.ingresoAlmacen.findMany({
        where,
        take,
        skip,
        orderBy,
        include: { detalles: true, proveedor: { select: { id: true, nombre: true } } },
      }),
      this.db.ingresoAlmacen.count({ where }),
    ])
    return { data, total }
  }
}
