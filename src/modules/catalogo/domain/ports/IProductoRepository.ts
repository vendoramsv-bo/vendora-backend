import type { ProductoEntity } from "../producto.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export interface ProductoCreateDTO {
  actividadId: string
  categoriaId: string
  unidadId: string
  codigo: string
  nombre: string
  descripcion?: string
  imagenUrl?: string
  tipoProducto?: string
  precio?: number
  cantidadStock?: number
  stockMinimo?: number
}

export interface ProductoUpdateDTO {
  nombre?: string
  descripcion?: string
  imagenUrl?: string
  tipoProducto?: string
  precio?: number
  cantidadStock?: number
  stockMinimo?: number
  unidadId?: string
  categoriaId?: string
}

export interface AtributoCreateDTO {
  nombre: string
  tipo?: string
  orden?: number
}

export interface AtributoValorCreateDTO {
  valor: string
  hexColor?: string
  imagenUrl?: string
  orden?: number
}

export interface VarianteCreateDTO {
  sku?: string
  precio?: number
  cantidadStock?: number
  stockMinimo?: number
  imagenUrl?: string
  atributoValorIds: string[]
}

export interface VarianteUpdateDTO {
  sku?: string
  precio?: number
  cantidadStock?: number
  stockMinimo?: number
  imagenUrl?: string
  estado?: string
}

export interface PrecioVolumenCreateDTO {
  etiqueta: string
  cantidad: number
  precio: number
  varianteId?: string
}

export interface OpcionCreateDTO {
  nombre: string
  descripcion?: string
  precio?: number
}

export interface OpcionUpdateDTO {
  nombre?: string
  descripcion?: string
  precio?: number
  estado?: string
}

export interface OfertaCreateDTO {
  fechaInicio: string
  fechaFin: string
  precioOferta: number
  varianteId?: string
  etiquetaVariante?: string
  descuento?: number
}

export interface OfertaUpdateDTO {
  fechaInicio?: string
  fechaFin?: string
  precioOferta?: number
  estado?: string
}

export interface ListResult<T> {
  data: T[]
  total: number
}

export interface IProductoRepository {
  // Productos base
  listar(tenantId: string, params: QueryParams): Promise<ListResult<ProductoEntity>>
  crear(data: ProductoCreateDTO, tenantId: string, userId: string): Promise<ProductoEntity>
  obtener(id: string, tenantId: string): Promise<ProductoEntity | null>
  actualizar(id: string, data: ProductoUpdateDTO, userId: string, precioAnterior?: string): Promise<ProductoEntity>
  cambiarEstado(id: string, estado: string, userId: string): Promise<void>
  listarPrecioHistorico(id: string, tenantId: string, params: QueryParams): Promise<ListResult<unknown>>

  // Atributos y variantes
  listarAtributos(productoId: string, tenantId: string): Promise<unknown[]>
  crearAtributo(productoId: string, data: AtributoCreateDTO): Promise<unknown>
  agregarValorAtributo(atributoId: string, data: AtributoValorCreateDTO): Promise<unknown>
  eliminarValorAtributo(valorId: string, productoId: string): Promise<void>
  listarVariantes(productoId: string, tenantId: string): Promise<unknown[]>
  crearVariante(productoId: string, data: VarianteCreateDTO): Promise<unknown>
  actualizarVariante(id: string, productoId: string, data: VarianteUpdateDTO): Promise<unknown>
  cambiarEstadoVariante(id: string, productoId: string, estado: string, userId: string): Promise<void>

  // Precios por volumen
  crearPrecioVolumen(productoId: string, data: PrecioVolumenCreateDTO): Promise<unknown>
  eliminarPrecioVolumen(id: string, productoId: string): Promise<void>

  // Opciones
  listarOpciones(productoId: string): Promise<unknown[]>
  crearOpcion(productoId: string, data: OpcionCreateDTO): Promise<unknown>
  actualizarOpcion(id: string, productoId: string, data: OpcionUpdateDTO): Promise<unknown>

  // Ofertas
  listarOfertas(productoId: string, soloVigentes: boolean): Promise<unknown[]>
  crearOferta(productoId: string, data: OfertaCreateDTO, tenantId: string): Promise<unknown>
  actualizarOferta(id: string, productoId: string, data: OfertaUpdateDTO): Promise<unknown>
}
