export interface ProductoVarianteRaw {
  id: string
  productoId: string
  sku?: string | null
  precio: { toString(): string }
  cantidadStock: number
  stockMinimo: number
  imagenUrl?: string | null
  estado: string
  createdAt: Date
  updatedAt?: Date | null
  atributos?: Array<{
    id: string
    varianteId: string
    atributoValorId: string
    atributoValor?: { id: string; valor: string; atributoId: string } | null
  }>
}

export interface ProductoOfertaRaw {
  id: string
  tenantId: string
  productoId: string
  varianteId?: string | null
  fechaInicio: Date
  fechaFin: Date
  precioOferta: { toString(): string }
  descuento: { toString(): string }
  estado: string
}

export interface ProductoOpcionRaw {
  id: string
  productoId: string
  nombre: string
  descripcion?: string | null
  precio: { toString(): string }
  estado: string
}

export interface ProductoAtributoRaw {
  id: string
  productoId: string
  nombre: string
  tipo: string
  orden: number
  valores?: Array<{ id: string; valor: string; hexColor?: string | null; imagenUrl?: string | null; orden: number }>
}

export interface ProductoPrecioVolumenRaw {
  id: string
  productoId: string
  varianteId?: string | null
  etiqueta: string
  cantidad: number
  precio: { toString(): string }
  estado: string
}

export interface ProductoRaw {
  id: string
  tenantId: string
  actividadId: string
  categoriaId: string
  unidadId: string
  codigo: string
  nombre: string
  descripcion?: string | null
  imagenUrl?: string | null
  tipoProducto: string
  precio: { toString(): string }
  cantidadStock: number
  stockMinimo: number
  estado: string
  createdAt: Date
  updatedAt?: Date | null
  createdById?: string | null
  updatedById?: string | null
  variantes?: ProductoVarianteRaw[]
  atributos?: ProductoAtributoRaw[]
  opcionesDelProducto?: ProductoOpcionRaw[]
  productosOfertas?: ProductoOfertaRaw[]
  preciosVolumen?: ProductoPrecioVolumenRaw[]
}

export class ProductoEntity {
  readonly id: string
  readonly tenantId: string
  readonly actividadId: string
  readonly categoriaId: string
  readonly unidadId: string
  readonly codigo: string
  readonly nombre: string
  readonly descripcion?: string | null
  readonly imagenUrl?: string | null
  readonly tipoProducto: string
  readonly precio: string
  readonly cantidadStock: number
  readonly stockMinimo: number
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt?: Date | null
  readonly createdById?: string | null
  readonly updatedById?: string | null
  readonly variantes: ProductoVarianteRaw[]
  readonly atributos: ProductoAtributoRaw[]
  readonly opcionesDelProducto: ProductoOpcionRaw[]
  readonly ofertasVigentes: ProductoOfertaRaw[]
  readonly preciosVolumen: ProductoPrecioVolumenRaw[]

  constructor(raw: ProductoRaw) {
    this.id = raw.id
    this.tenantId = raw.tenantId
    this.actividadId = raw.actividadId
    this.categoriaId = raw.categoriaId
    this.unidadId = raw.unidadId
    this.codigo = raw.codigo
    this.nombre = raw.nombre
    this.descripcion = raw.descripcion
    this.imagenUrl = raw.imagenUrl
    this.tipoProducto = raw.tipoProducto
    this.precio = raw.precio.toString()
    this.cantidadStock = raw.cantidadStock
    this.stockMinimo = raw.stockMinimo
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
    this.variantes = raw.variantes ?? []
    this.atributos = raw.atributos ?? []
    this.opcionesDelProducto = raw.opcionesDelProducto ?? []
    this.ofertasVigentes = raw.productosOfertas ?? []
    this.preciosVolumen = raw.preciosVolumen ?? []
  }

  static fromPrisma(raw: ProductoRaw): ProductoEntity {
    return new ProductoEntity(raw)
  }

  estaActivo(): boolean {
    return this.estado === "ACTIVO"
  }

  calcularPrecioEfectivo(): string {
    if (this.ofertasVigentes.length > 0) {
      return this.ofertasVigentes[0].precioOferta.toString()
    }
    return this.precio
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      actividadId: this.actividadId,
      categoriaId: this.categoriaId,
      unidadId: this.unidadId,
      codigo: this.codigo,
      nombre: this.nombre,
      descripcion: this.descripcion,
      imagenUrl: this.imagenUrl,
      tipoProducto: this.tipoProducto,
      precio: this.precio,
      precioEfectivo: this.calcularPrecioEfectivo(),
      cantidadStock: this.cantidadStock,
      stockMinimo: this.stockMinimo,
      estado: this.estado,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdById: this.createdById,
      updatedById: this.updatedById,
      variantes: this.variantes,
      atributos: this.atributos,
      opciones: this.opcionesDelProducto,
      ofertasVigentes: this.ofertasVigentes,
      preciosVolumen: this.preciosVolumen,
    }
  }
}
