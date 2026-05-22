import type {
  IProductoRepository,
  ProductoCreateDTO,
  ProductoUpdateDTO,
  AtributoCreateDTO,
  AtributoValorCreateDTO,
  VarianteCreateDTO,
  VarianteUpdateDTO,
  PrecioVolumenCreateDTO,
  OpcionCreateDTO,
  OpcionUpdateDTO,
  OfertaCreateDTO,
  OfertaUpdateDTO,
  ListResult,
} from "../../src/modules/catalogo/domain/ports/IProductoRepository.js"
import { ProductoEntity, type ProductoRaw } from "../../src/modules/catalogo/domain/producto.entity.js"
import type { QueryParams } from "../../src/core/query-params.js"
import {
  VarianteSkuDuplicado,
  VarianteAtributosDuplicados,
  OfertaSolapada,
  PrecioVolumenCantidadDuplicada,
  OpcionNombreDuplicada,
  AtributoValorEnUso,
} from "../../src/modules/catalogo/domain/catalogo.errors.js"

let idCounter = 0
function nextId() {
  return `fake-${++idCounter}`
}

function makeProductoRaw(data: ProductoCreateDTO, tenantId: string, userId: string, id: string): ProductoRaw {
  return {
    id,
    tenantId,
    actividadId: data.actividadId,
    categoriaId: data.categoriaId,
    unidadId: data.unidadId,
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion: data.descripcion,
    imagenUrl: data.imagenUrl,
    tipoProducto: data.tipoProducto ?? "COMERCIALIZACION",
    precio: { toString: () => String(data.precio ?? 0) },
    cantidadStock: data.cantidadStock ?? 0,
    stockMinimo: data.stockMinimo ?? 0,
    estado: "ACTIVO",
    createdAt: new Date(),
    updatedAt: null,
    createdById: userId,
    updatedById: userId,
    variantes: [],
    atributos: [],
    opcionesDelProducto: [],
    productosOfertas: [],
    preciosVolumen: [],
  }
}

export class FakeProductoRepository implements IProductoRepository {
  private productos = new Map<string, ProductoRaw>()
  private historico: unknown[] = []
  private variantes: unknown[] = []
  private atributos: unknown[] = []
  private opciones: unknown[] = []
  private ofertas: unknown[] = []
  private preciosVolumen: unknown[] = []

  async listar(tenantId: string, params: QueryParams): Promise<ListResult<ProductoEntity>> {
    const { take, skip } = params
    const items = [...this.productos.values()].filter((p) => p.tenantId === tenantId)
    const paginated = items.slice(skip, skip + take)
    return { data: paginated.map((r) => ProductoEntity.fromPrisma(r)), total: items.length }
  }

  async crear(data: ProductoCreateDTO, tenantId: string, userId: string): Promise<ProductoEntity> {
    const id = nextId()
    const raw = makeProductoRaw(data, tenantId, userId, id)
    this.productos.set(id, raw)
    return ProductoEntity.fromPrisma(raw)
  }

  async obtener(id: string, tenantId: string): Promise<ProductoEntity | null> {
    const raw = this.productos.get(id)
    if (!raw || raw.tenantId !== tenantId) return null
    return ProductoEntity.fromPrisma(raw)
  }

  async actualizar(id: string, data: ProductoUpdateDTO, userId: string, precioAnterior?: string): Promise<ProductoEntity> {
    const raw = this.productos.get(id)
    if (!raw) throw new Error("Producto no encontrado")
    if (precioAnterior !== undefined && data.precio !== undefined) {
      this.historico.push({ productoId: id, tenantId: raw.tenantId, precioAnterior, precioNuevo: String(data.precio), createdAt: new Date() })
    }
    const updated: ProductoRaw = {
      ...raw,
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.precio !== undefined && { precio: { toString: () => String(data.precio) } }),
      ...(data.tipoProducto !== undefined && { tipoProducto: data.tipoProducto }),
      updatedById: userId,
      updatedAt: new Date(),
    }
    this.productos.set(id, updated)
    return ProductoEntity.fromPrisma(updated)
  }

  async cambiarEstado(id: string, estado: string, _userId: string): Promise<void> {
    const raw = this.productos.get(id)
    if (!raw) throw new Error("Producto no encontrado")
    this.productos.set(id, { ...raw, estado })
  }

  async listarPrecioHistorico(id: string, _tenantId: string, params: QueryParams): Promise<ListResult<unknown>> {
    const { take, skip } = params
    const items = this.historico.filter((h) => (h as { productoId: string }).productoId === id)
    return { data: items.slice(skip, skip + take), total: items.length }
  }

  getHistorico() { return this.historico }

  async listarAtributos(_productoId: string, _tenantId: string): Promise<unknown[]> {
    return this.atributos.filter((a) => (a as { productoId: string }).productoId === _productoId)
  }

  async crearAtributo(productoId: string, data: AtributoCreateDTO): Promise<unknown> {
    const id = nextId()
    const atributo = { id, productoId, ...data, valores: [] }
    this.atributos.push(atributo)
    return atributo
  }

  async agregarValorAtributo(atributoId: string, data: AtributoValorCreateDTO): Promise<unknown> {
    const id = nextId()
    const valor = { id, atributoId, ...data }
    return valor
  }

  async eliminarValorAtributo(valorId: string, _productoId: string): Promise<void> {
    const enUso = this.variantes.some((v) => {
      const variante = v as { atributos: Array<{ atributoValorId: string }>; estado: string }
      return variante.estado === "ACTIVO" && variante.atributos.some((a) => a.atributoValorId === valorId)
    })
    if (enUso) throw new AtributoValorEnUso()
  }

  async listarVariantes(productoId: string, _tenantId: string): Promise<unknown[]> {
    return this.variantes.filter((v) => (v as { productoId: string }).productoId === productoId)
  }

  async crearVariante(productoId: string, data: VarianteCreateDTO): Promise<unknown> {
    if (data.sku) {
      const skuExiste = this.variantes.some(
        (v) => (v as { productoId: string; sku?: string }).productoId === productoId && (v as { sku?: string }).sku === data.sku
      )
      if (skuExiste) throw new VarianteSkuDuplicado()
    }

    const sortedIds = [...data.atributoValorIds].sort()
    const variantesProducto = this.variantes.filter(
      (v) => (v as { productoId: string; estado: string }).productoId === productoId && (v as { estado: string }).estado === "ACTIVO"
    )
    for (const v of variantesProducto) {
      const existingIds = ((v as { atributos: Array<{ atributoValorId: string }> }).atributos ?? [])
        .map((a) => a.atributoValorId).sort()
      if (JSON.stringify(existingIds) === JSON.stringify(sortedIds)) {
        throw new VarianteAtributosDuplicados()
      }
    }

    const id = nextId()
    const variante = {
      id,
      productoId,
      sku: data.sku,
      precio: { toString: () => String(data.precio ?? 0) },
      cantidadStock: data.cantidadStock ?? 0,
      stockMinimo: data.stockMinimo ?? 0,
      imagenUrl: data.imagenUrl,
      estado: "ACTIVO",
      createdAt: new Date(),
      atributos: data.atributoValorIds.map((atributoValorId) => ({ id: nextId(), varianteId: id, atributoValorId })),
    }
    this.variantes.push(variante)
    return variante
  }

  async actualizarVariante(id: string, _productoId: string, data: VarianteUpdateDTO): Promise<unknown> {
    const idx = this.variantes.findIndex((v) => (v as { id: string }).id === id)
    if (idx === -1) throw new Error("P2025")
    const updated = { ...(this.variantes[idx] as object), ...data }
    this.variantes[idx] = updated
    return updated
  }

  async cambiarEstadoVariante(id: string, _productoId: string, estado: string, _userId: string): Promise<void> {
    const idx = this.variantes.findIndex((v) => (v as { id: string }).id === id)
    if (idx !== -1) this.variantes[idx] = { ...(this.variantes[idx] as object), estado }
  }

  async crearPrecioVolumen(productoId: string, data: PrecioVolumenCreateDTO): Promise<unknown> {
    const existente = this.preciosVolumen.find((p) => {
      const pv = p as { productoId: string; cantidad: number; varianteId?: string }
      return pv.productoId === productoId && pv.cantidad === data.cantidad && (pv.varianteId ?? null) === (data.varianteId ?? null)
    })
    if (existente) throw new PrecioVolumenCantidadDuplicada()
    const pv = { id: nextId(), productoId, ...data }
    this.preciosVolumen.push(pv)
    return pv
  }

  async eliminarPrecioVolumen(id: string, _productoId: string): Promise<void> {
    const idx = this.preciosVolumen.findIndex((p) => (p as { id: string }).id === id)
    if (idx !== -1) this.preciosVolumen.splice(idx, 1)
  }

  async listarOpciones(productoId: string): Promise<unknown[]> {
    return this.opciones.filter((o) => (o as { productoId: string }).productoId === productoId)
  }

  async crearOpcion(productoId: string, data: OpcionCreateDTO): Promise<unknown> {
    const existente = this.opciones.find(
      (o) => (o as { productoId: string; nombre: string }).productoId === productoId && (o as { nombre: string }).nombre === data.nombre
    )
    if (existente) throw new OpcionNombreDuplicada()
    const opcion = { id: nextId(), productoId, estado: "ACTIVO", ...data }
    this.opciones.push(opcion)
    return opcion
  }

  async actualizarOpcion(id: string, _productoId: string, data: OpcionUpdateDTO): Promise<unknown> {
    const idx = this.opciones.findIndex((o) => (o as { id: string }).id === id)
    if (idx === -1) throw new Error("P2025")
    const updated = { ...(this.opciones[idx] as object), ...data }
    this.opciones[idx] = updated
    return updated
  }

  async listarOfertas(productoId: string, soloVigentes: boolean): Promise<unknown[]> {
    const now = new Date()
    return this.ofertas.filter((o) => {
      const oferta = o as { productoId: string; estado: string; fechaInicio: Date; fechaFin: Date }
      if (oferta.productoId !== productoId) return false
      if (!soloVigentes) return true
      return oferta.estado === "ACTIVO" && oferta.fechaInicio <= now && oferta.fechaFin >= now
    })
  }

  async crearOferta(productoId: string, data: OfertaCreateDTO, tenantId: string): Promise<unknown> {
    const fechaInicio = new Date(data.fechaInicio)
    const fechaFin = new Date(data.fechaFin)
    const solapada = this.ofertas.find((o) => {
      const oferta = o as { productoId: string; varianteId?: string; estado: string; fechaInicio: Date; fechaFin: Date }
      return (
        oferta.productoId === productoId &&
        (oferta.varianteId ?? null) === (data.varianteId ?? null) &&
        oferta.estado === "ACTIVO" &&
        oferta.fechaInicio <= fechaFin &&
        oferta.fechaFin >= fechaInicio
      )
    })
    if (solapada) throw new OfertaSolapada()
    const oferta = {
      id: nextId(),
      tenantId,
      productoId,
      varianteId: data.varianteId ?? null,
      fechaInicio,
      fechaFin,
      precioOferta: { toString: () => String(data.precioOferta) },
      descuento: { toString: () => String(data.descuento ?? 0) },
      estado: "ACTIVO",
    }
    this.ofertas.push(oferta)
    return oferta
  }

  async actualizarOferta(id: string, _productoId: string, data: OfertaUpdateDTO): Promise<unknown> {
    const idx = this.ofertas.findIndex((o) => (o as { id: string }).id === id)
    if (idx === -1) throw new Error("P2025")
    const updated = { ...(this.ofertas[idx] as object), ...data }
    this.ofertas[idx] = updated
    return updated
  }
}
