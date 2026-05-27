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
  tipoDescuento: string
  porcentajeDescuento?: number
  montoDescuento?: number
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
  tipoDescuento?: string
  porcentajeDescuento?: number
  montoDescuento?: number
}

export interface ConfirmarVarianteItemDTO {
  atributoValorIds: string[]
  precio?: number
  cantidadStock?: number
  imagenUrl?: string
}

export interface PropuestaVarianteItem {
  etiqueta: string
  combinacion: Array<{ atributo: string; valor: string; atributoValorId: string }>
  valoresIds: string[]
}

export interface AltaMasivaResult {
  creados: ProductoEntity[]
  categoriasCreadas: number
  unidadesMedidaCreadas: number
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

  // Verificación y eliminación
  verificarCodigo(tenantId: string, codigo: string): Promise<{ existe: boolean; producto?: { id: string; nombre: string; codigo: string } }>
  eliminar(id: string, tenantId: string): Promise<void>

  // Integración con inventario (cross-schema almacen)
  registrarMovimientoCreacion(productoId: string, tenantId: string, cantidadStock: number, userId: string): Promise<void>
  eliminarMovimientoCreacion(productoId: string, tenantId: string): Promise<void>
  actualizarMovimientoCreacion(productoId: string, tenantId: string, cantidadStock: number): Promise<void>
  tieneMovimientosReales(productoId: string): Promise<boolean>

  // Atributos y variantes
  listarAtributos(productoId: string, tenantId: string): Promise<unknown[]>
  crearAtributo(productoId: string, data: AtributoCreateDTO): Promise<unknown>
  agregarValorAtributo(atributoId: string, data: AtributoValorCreateDTO): Promise<unknown>
  eliminarValorAtributo(valorId: string, productoId: string): Promise<void>
  listarVariantes(productoId: string, tenantId: string): Promise<unknown[]>
  crearVariante(productoId: string, data: VarianteCreateDTO): Promise<unknown>
  actualizarVariante(id: string, productoId: string, data: VarianteUpdateDTO): Promise<unknown>
  cambiarEstadoVariante(id: string, productoId: string, estado: string, userId: string): Promise<void>

  // Variantes cartesianas
  generarPropuestaVariantes(productoId: string, tenantId: string): Promise<PropuestaVarianteItem[]>
  confirmarVariantes(productoId: string, variantes: ConfirmarVarianteItemDTO[]): Promise<unknown[]>

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

  // Alta masiva desde catálogo maestro
  altaMasiva(claProductoIds: string[], tenantId: string, userId: string): Promise<AltaMasivaResult>
}
