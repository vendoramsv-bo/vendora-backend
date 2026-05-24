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
} from "../../src/modules/ventas/domain/ports/ICompraRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"
import { CompraNoEncontradaError, CompraYaConfirmadaError } from "../../src/modules/ventas/domain/ventas.errors.js"

export class FakeCompraRepository implements ICompraRepository {
  private _compras = new Map<string, CompraData>()
  private _counter = 1
  private _detCounter = 1
  private _costoCounter = 1

  seed(c: CompraData): void {
    this._compras.set(c.id, c)
  }

  async obtenerPorId(id: string, tenantId: string): Promise<CompraData | null> {
    const c = this._compras.get(id)
    if (!c || c.tenantId !== tenantId) return null
    return c
  }

  async crear(dto: CrearCompraDTO): Promise<CompraData> {
    const id = `compra-${this._counter++}`
    const detalles: CompraDetalleData[] = dto.detalles.map((d) => ({
      id: `det-${this._detCounter++}`,
      compraId: id,
      productoId: d.productoId,
      varianteId: d.varianteId ?? null,
      etiquetaVariante: d.etiquetaVariante ?? null,
      cantidad: d.cantidad,
      precio: d.precio,
      total: d.precio * d.cantidad,
      precioEstimadoVenta: d.precioEstimadoVenta,
      createdAt: new Date(),
    }))
    const costosAdicionales: CompraCostoData[] = (dto.costosAdicionales ?? []).map((ca) => ({
      id: `costo-${this._costoCounter++}`,
      compraId: id,
      motivo: ca.motivo,
      costo: ca.costo,
      createdAt: new Date(),
    }))
    const totalCantidad = detalles.reduce((s, d) => s + d.cantidad, 0)
    const totalCompra = detalles.reduce((s, d) => s + d.total, 0)
    const totalCostoAdicional = costosAdicionales.reduce((s, ca) => s + ca.costo, 0)
    const c: CompraData = {
      id,
      tenantId: dto.tenantId,
      fecha: dto.fecha ?? new Date(),
      descripcion: dto.descripcion ?? null,
      proveedorId: dto.proveedorId,
      totalCantidad,
      totalCompra,
      totalCostoAdicional,
      estado: "PENDIENTE",
      createdAt: new Date(),
      updatedAt: null,
      createdById: dto.createdById ?? null,
      updatedById: null,
      detalles,
      costosAdicionales,
    }
    this._compras.set(id, c)
    return c
  }

  async actualizar(id: string, tenantId: string, dto: ActualizarCompraDTO): Promise<CompraData> {
    const c = this._compras.get(id)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(id)
    if (c.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()
    const updated: CompraData = {
      ...c,
      proveedorId: dto.proveedorId ?? c.proveedorId,
      fecha: dto.fecha ?? c.fecha,
      descripcion: dto.descripcion !== undefined ? dto.descripcion : c.descripcion,
      updatedById: dto.updatedById ?? c.updatedById,
    }
    this._compras.set(id, updated)
    return updated
  }

  async eliminar(id: string, tenantId: string): Promise<void> {
    const c = this._compras.get(id)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(id)
    if (c.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()
    this._compras.delete(id)
  }

  async confirmar(id: string, tenantId: string, _updatedById?: string | null): Promise<ConfirmarResultado> {
    const c = this._compras.get(id)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(id)
    if (c.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()
    const updated: CompraData = { ...c, estado: "CONFIRMADA" }
    this._compras.set(id, updated)
    return { compra: updated, advertencias: [] }
  }

  async listar(tenantId: string, _params: QueryParams, estado?: string, proveedorId?: string): Promise<{ data: CompraData[]; total: number }> {
    let data = Array.from(this._compras.values()).filter((c) => c.tenantId === tenantId)
    if (estado) data = data.filter((c) => c.estado === estado)
    if (proveedorId) data = data.filter((c) => c.proveedorId === proveedorId)
    return { data, total: data.length }
  }

  async agregarDetalle(compraId: string, tenantId: string, detalle: CompraDetalleInput): Promise<CompraDetalleData> {
    const c = this._compras.get(compraId)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(compraId)
    const d: CompraDetalleData = {
      id: `det-${this._detCounter++}`,
      compraId,
      productoId: detalle.productoId,
      varianteId: detalle.varianteId ?? null,
      etiquetaVariante: detalle.etiquetaVariante ?? null,
      cantidad: detalle.cantidad,
      precio: detalle.precio,
      total: detalle.precio * detalle.cantidad,
      precioEstimadoVenta: detalle.precioEstimadoVenta,
      createdAt: new Date(),
    }
    const detalles = [...(c.detalles ?? []), d]
    this._compras.set(compraId, {
      ...c,
      detalles,
      totalCantidad: detalles.reduce((s, x) => s + x.cantidad, 0),
      totalCompra: detalles.reduce((s, x) => s + x.total, 0),
    })
    return d
  }

  async actualizarDetalle(compraId: string, detalleId: string, tenantId: string, dto: ActualizarDetalleDTO): Promise<CompraDetalleData> {
    const c = this._compras.get(compraId)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(compraId)
    const detalles = (c.detalles ?? []).map((d) => {
      if (d.id !== detalleId) return d
      const cantidad = dto.cantidad ?? d.cantidad
      const precio = dto.precio ?? d.precio
      return { ...d, cantidad, precio, total: precio * cantidad, precioEstimadoVenta: dto.precioEstimadoVenta ?? d.precioEstimadoVenta }
    })
    this._compras.set(compraId, {
      ...c,
      detalles,
      totalCantidad: detalles.reduce((s, x) => s + x.cantidad, 0),
      totalCompra: detalles.reduce((s, x) => s + x.total, 0),
    })
    return detalles.find((d) => d.id === detalleId)!
  }

  async eliminarDetalle(compraId: string, detalleId: string, tenantId: string): Promise<void> {
    const c = this._compras.get(compraId)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(compraId)
    const detalles = (c.detalles ?? []).filter((d) => d.id !== detalleId)
    this._compras.set(compraId, {
      ...c,
      detalles,
      totalCantidad: detalles.reduce((s, x) => s + x.cantidad, 0),
      totalCompra: detalles.reduce((s, x) => s + x.total, 0),
    })
  }

  async agregarCosto(compraId: string, tenantId: string, costo: CompraCostoInput): Promise<CompraCostoData> {
    const c = this._compras.get(compraId)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(compraId)
    const ca: CompraCostoData = {
      id: `costo-${this._costoCounter++}`,
      compraId,
      motivo: costo.motivo,
      costo: costo.costo,
      createdAt: new Date(),
    }
    const costosAdicionales = [...(c.costosAdicionales ?? []), ca]
    this._compras.set(compraId, {
      ...c,
      costosAdicionales,
      totalCostoAdicional: costosAdicionales.reduce((s, x) => s + x.costo, 0),
    })
    return ca
  }

  async actualizarCosto(compraId: string, costoId: string, tenantId: string, costo: number): Promise<CompraCostoData> {
    const c = this._compras.get(compraId)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(compraId)
    const costosAdicionales = (c.costosAdicionales ?? []).map((ca) =>
      ca.id === costoId ? { ...ca, costo } : ca
    )
    this._compras.set(compraId, {
      ...c,
      costosAdicionales,
      totalCostoAdicional: costosAdicionales.reduce((s, x) => s + x.costo, 0),
    })
    return costosAdicionales.find((ca) => ca.id === costoId)!
  }

  async eliminarCosto(compraId: string, costoId: string, tenantId: string): Promise<void> {
    const c = this._compras.get(compraId)
    if (!c || c.tenantId !== tenantId) throw new CompraNoEncontradaError(compraId)
    const costosAdicionales = (c.costosAdicionales ?? []).filter((ca) => ca.id !== costoId)
    this._compras.set(compraId, {
      ...c,
      costosAdicionales,
      totalCostoAdicional: costosAdicionales.reduce((s, x) => s + x.costo, 0),
    })
  }
}
