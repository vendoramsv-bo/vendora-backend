import type {
  ICompraRepository,
  CompraData,
  CompraDetalleData,
  CompraCostoData,
  CrearCompraDTO,
  ActualizarCompraDTO,
  ActualizarDetalleDTO,
  CompraDetalleInput,
  CompraCostoInput,
  ConfirmarResultado,
} from "../domain/ports/ICompraRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import {
  CompraNoEncontradaError,
  CompraYaConfirmadaError,
  DetalleYaExisteError,
  CostoMotivoYaExisteError,
} from "../domain/ventas.errors.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDetalleData(raw: any): CompraDetalleData {
  return {
    id: raw.id,
    compraId: raw.compraId,
    productoId: raw.productoId,
    varianteId: raw.varianteId ?? null,
    etiquetaVariante: raw.etiquetaVariante ?? null,
    cantidad: raw.cantidad,
    precio: Number(raw.precio),
    total: Number(raw.total),
    precioEstimadoVenta: Number(raw.precioEstimadoVenta),
    createdAt: raw.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCostoData(raw: any): CompraCostoData {
  return {
    id: raw.id,
    compraId: raw.compraId,
    motivo: raw.motivo,
    costo: Number(raw.costo),
    createdAt: raw.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCompraData(raw: any): CompraData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    fecha: raw.fecha,
    descripcion: raw.descripcion ?? null,
    proveedorId: raw.proveedorId,
    proveedor: raw.proveedor ? { id: raw.proveedor.id, nombre: raw.proveedor.nombre } : null,
    totalCantidad: raw.totalCantidad,
    totalCompra: Number(raw.totalCompra),
    totalCostoAdicional: Number(raw.totalCostoAdicional),
    estado: raw.estado,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
    detalles: raw.comprasDetalle ? raw.comprasDetalle.map(toDetalleData) : undefined,
    costosAdicionales: raw.comprasCostoAdicional ? raw.comprasCostoAdicional.map(toCostoData) : undefined,
  }
}

const includeDetalleCosto = {
  proveedor: { select: { id: true, nombre: true } },
  comprasDetalle: true,
  comprasCostoAdicional: true,
}

async function recalcularTotales(db: any, compraId: string) {
  const detalles = await db.compraDetalle.findMany({ where: { compraId } })
  const costos = await db.compraCostoAdicional.findMany({ where: { compraId } })
  const totalCantidad = detalles.reduce((s: number, d: any) => s + d.cantidad, 0)
  const totalCompra = detalles.reduce((s: number, d: any) => s + Number(d.total), 0)
  const totalCostoAdicional = costos.reduce((s: number, c: any) => s + Number(c.costo), 0)
  await db.compra.update({
    where: { id: compraId },
    data: { totalCantidad, totalCompra, totalCostoAdicional },
  })
}

export class CompraPrismaRepository implements ICompraRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async obtenerPorId(id: string, tenantId: string): Promise<CompraData | null> {
    const raw = await this.db.compra.findFirst({
      where: { id, tenantId },
      include: includeDetalleCosto,
    })
    return raw ? toCompraData(raw) : null
  }

  async crear(dto: CrearCompraDTO): Promise<CompraData> {
    const raw = await this.db.compra.create({
      data: {
        tenantId: dto.tenantId,
        proveedorId: dto.proveedorId,
        fecha: dto.fecha ?? new Date(),
        descripcion: dto.descripcion ?? null,
        estado: "PENDIENTE",
        totalCantidad: dto.detalles.reduce((s, d) => s + d.cantidad, 0),
        totalCompra: dto.detalles.reduce((s, d) => s + d.precio * d.cantidad, 0),
        totalCostoAdicional: (dto.costosAdicionales ?? []).reduce((s, c) => s + c.costo, 0),
        createdById: dto.createdById ?? null,
        comprasDetalle: {
          create: dto.detalles.map((d) => ({
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            etiquetaVariante: d.etiquetaVariante ?? null,
            cantidad: d.cantidad,
            precio: d.precio,
            total: d.precio * d.cantidad,
            precioEstimadoVenta: d.precioEstimadoVenta,
          })),
        },
        ...(dto.costosAdicionales && dto.costosAdicionales.length > 0
          ? {
              comprasCostoAdicional: {
                create: dto.costosAdicionales.map((c) => ({ motivo: c.motivo, costo: c.costo })),
              },
            }
          : {}),
      },
      include: includeDetalleCosto,
    })
    return toCompraData(raw)
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarCompraDTO): Promise<CompraData> {
    const raw = await this.db.compra.update({
      where: { id, tenantId },
      data: {
        ...(dto.proveedorId !== undefined && { proveedorId: dto.proveedorId }),
        ...(dto.fecha !== undefined && { fecha: dto.fecha }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.updatedById !== undefined && { updatedById: dto.updatedById }),
      },
      include: includeDetalleCosto,
    })
    return toCompraData(raw)
  }

  async eliminar(id: string, tenantId: string): Promise<void> {
    await this.db.compra.delete({ where: { id, tenantId } })
  }

  async listar(tenantId: string, params: QueryParams, estado?: string, proveedorId?: string): Promise<{ data: CompraData[]; total: number }> {
    const args = toPrismaArgs(params, [])
    const where = {
      ...args.where,
      tenantId,
      ...(estado && { estado }),
      ...(proveedorId && { proveedorId }),
    }
    const [data, total] = await Promise.all([
      this.db.compra.findMany({
        where,
        take: args.take,
        skip: args.skip,
        orderBy: args.orderBy,
        include: { proveedor: { select: { id: true, nombre: true } } },
      }),
      this.db.compra.count({ where }),
    ])
    return { data: data.map(toCompraData), total }
  }

  async agregarDetalle(compraId: string, tenantId: string, detalle: CompraDetalleInput): Promise<CompraDetalleData> {
    const compra = await this.db.compra.findFirst({ where: { id: compraId, tenantId } })
    if (!compra) throw new CompraNoEncontradaError(compraId)
    if (compra.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()

    const existing = await this.db.compraDetalle.findFirst({
      where: { compraId, productoId: detalle.productoId, varianteId: detalle.varianteId ?? null },
    })
    if (existing) throw new DetalleYaExisteError()

    const raw = await this.db.compraDetalle.create({
      data: {
        compraId,
        productoId: detalle.productoId,
        varianteId: detalle.varianteId ?? null,
        etiquetaVariante: detalle.etiquetaVariante ?? null,
        cantidad: detalle.cantidad,
        precio: detalle.precio,
        total: detalle.precio * detalle.cantidad,
        precioEstimadoVenta: detalle.precioEstimadoVenta,
      },
    })
    await recalcularTotales(this.db, compraId)
    return toDetalleData(raw)
  }

  async actualizarDetalle(compraId: string, detalleId: string, tenantId: string, dto: ActualizarDetalleDTO): Promise<CompraDetalleData> {
    const compra = await this.db.compra.findFirst({ where: { id: compraId, tenantId } })
    if (!compra) throw new CompraNoEncontradaError(compraId)
    if (compra.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()

    const existing = await this.db.compraDetalle.findFirst({ where: { id: detalleId, compraId } })
    const cantidad = dto.cantidad ?? existing.cantidad
    const precio = dto.precio ?? Number(existing.precio)
    const raw = await this.db.compraDetalle.update({
      where: { id: detalleId },
      data: {
        ...(dto.cantidad !== undefined && { cantidad }),
        ...(dto.precio !== undefined && { precio }),
        total: precio * cantidad,
        ...(dto.precioEstimadoVenta !== undefined && { precioEstimadoVenta: dto.precioEstimadoVenta }),
      },
    })
    await recalcularTotales(this.db, compraId)
    return toDetalleData(raw)
  }

  async eliminarDetalle(compraId: string, detalleId: string, tenantId: string): Promise<void> {
    const compra = await this.db.compra.findFirst({ where: { id: compraId, tenantId } })
    if (!compra) throw new CompraNoEncontradaError(compraId)
    if (compra.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()
    await this.db.compraDetalle.delete({ where: { id: detalleId } })
    await recalcularTotales(this.db, compraId)
  }

  async agregarCosto(compraId: string, tenantId: string, costo: CompraCostoInput): Promise<CompraCostoData> {
    const compra = await this.db.compra.findFirst({ where: { id: compraId, tenantId } })
    if (!compra) throw new CompraNoEncontradaError(compraId)
    if (compra.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()

    const existing = await this.db.compraCostoAdicional.findFirst({ where: { compraId, motivo: costo.motivo } })
    if (existing) throw new CostoMotivoYaExisteError(costo.motivo)

    const raw = await this.db.compraCostoAdicional.create({
      data: { compraId, motivo: costo.motivo, costo: costo.costo },
    })
    await recalcularTotales(this.db, compraId)
    return toCostoData(raw)
  }

  async actualizarCosto(compraId: string, costoId: string, tenantId: string, costo: number): Promise<CompraCostoData> {
    const compra = await this.db.compra.findFirst({ where: { id: compraId, tenantId } })
    if (!compra) throw new CompraNoEncontradaError(compraId)
    if (compra.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()
    const raw = await this.db.compraCostoAdicional.update({
      where: { id: costoId },
      data: { costo },
    })
    await recalcularTotales(this.db, compraId)
    return toCostoData(raw)
  }

  async eliminarCosto(compraId: string, costoId: string, tenantId: string): Promise<void> {
    const compra = await this.db.compra.findFirst({ where: { id: compraId, tenantId } })
    if (!compra) throw new CompraNoEncontradaError(compraId)
    if (compra.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()
    await this.db.compraCostoAdicional.delete({ where: { id: costoId } })
    await recalcularTotales(this.db, compraId)
  }

  async confirmar(id: string, tenantId: string, updatedById?: string | null): Promise<ConfirmarResultado> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultado = await this.db.$transaction(async (tx: any) => {
      const compraRaw = await tx.compra.findFirst({
        where: { id, tenantId },
        include: { comprasDetalle: true },
      })
      if (!compraRaw) throw new CompraNoEncontradaError(id)
      if (compraRaw.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()

      const advertencias: string[] = []

      for (const detalle of compraRaw.comprasDetalle) {
        if (!detalle.varianteId) {
          advertencias.push(`Producto ${detalle.productoId} sin variante — stock no actualizado`)
          continue
        }

        const variante = await tx.productoVariante.findUnique({ where: { id: detalle.varianteId } })
        if (!variante || !variante.inventarioActivado) {
          advertencias.push(`Variante ${detalle.varianteId} sin inventario activado — stock no actualizado`)
          continue
        }

        const stockAntes = variante.cantidadStock
        const stockDespues = stockAntes + detalle.cantidad

        await tx.productoVariante.update({
          where: { id: detalle.varianteId },
          data: { cantidadStock: stockDespues },
        })

        await tx.movimientoInventario.create({
          data: {
            tenantId,
            productoId: detalle.productoId,
            varianteId: detalle.varianteId,
            etiquetaVariante: detalle.etiquetaVariante ?? null,
            tipo: "ENTRADA",
            cantidad: detalle.cantidad,
            motivo: "Compra confirmada",
            referenciaId: id,
            stockAntes,
            stockDespues,
            createdById: updatedById ?? null,
          },
        })
      }

      const updatedRaw = await tx.compra.update({
        where: { id },
        data: { estado: "CONFIRMADA", updatedById: updatedById ?? null },
        include: includeDetalleCosto,
      })

      return { compra: toCompraData(updatedRaw), advertencias }
    })

    return resultado
  }
}
