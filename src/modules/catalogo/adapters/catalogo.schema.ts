import { z } from "zod"
import { makeQueryParamsSchema } from "../../../core/query-params.js"

export const QueryParamsCatalogoSchema = makeQueryParamsSchema([
  "nombre",
  "codigo",
  "precio",
  "cantidadStock",
  "createdAt",
  "updatedAt",
  "estado",
])

export const EstadoSchema = z.enum(["ACTIVO", "INACTIVO"])

export const CambiarEstadoSchema = z.object({
  estado: EstadoSchema,
})

export const ActividadCreateSchema = z.object({
  claActividadId: z.string().min(1),
})

export const UnidadCreateSchema = z.object({
  unidad: z.string().min(1),
  sigla: z.string().min(1),
  descripcion: z.string().min(1),
  claUnidadId: z.string().optional(),
})

export const UnidadUpdateSchema = UnidadCreateSchema.partial()

export const CategoriaCreateSchema = z.object({
  actividadId: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  imagenUrl: z.string().url().optional(),
  padreId: z.string().nullable().optional(),
})

export const CategoriaUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  imagenUrl: z.string().url().optional(),
})

export const TipoDescuentoSchema = z.enum(["SIN_DESCUENTO", "PORCENTAJE", "MONTO_FIJO"])

export const ProductoCreateSchema = z.object({
  actividadId: z.string().min(1),
  categoriaId: z.string().min(1),
  unidadId: z.string().min(1),
  codigo: z.string().min(1).transform((v) => v.trim()),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  imagenUrl: z.string().url().optional(),
  tipoProducto: z.enum(["COMERCIALIZACION", "SERVICIO", "PLATO", "BEBIDA", "POSTRE", "COMPLEMENTO"]).default("COMERCIALIZACION"),
  precio: z.number().min(0).default(0),
  cantidadStock: z.number().int().min(0).default(0),
  stockMinimo: z.number().int().min(0).default(0),
  tipoDescuento: TipoDescuentoSchema,
  porcentajeDescuento: z.number().min(0).max(100).optional(),
  montoDescuento: z.number().min(0).optional(),
})

export const ProductoUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  imagenUrl: z.string().url().optional(),
  tipoProducto: z.enum(["COMERCIALIZACION", "SERVICIO", "PLATO", "BEBIDA", "POSTRE", "COMPLEMENTO"]).optional(),
  precio: z.number().min(0).optional(),
  cantidadStock: z.number().int().min(0).optional(),
  stockMinimo: z.number().int().min(0).optional(),
  unidadId: z.string().optional(),
  categoriaId: z.string().optional(),
  tipoDescuento: TipoDescuentoSchema.optional(),
  porcentajeDescuento: z.number().min(0).max(100).optional(),
  montoDescuento: z.number().min(0).optional(),
})

export const AtributoCreateSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(["TEXTO", "COLOR", "IMAGEN", "NUMERO"]).default("TEXTO"),
  orden: z.number().int().min(0).default(0),
})

export const AtributoValorCreateSchema = z.object({
  valor: z.string().min(1),
  hexColor: z.string().optional(),
  imagenUrl: z.string().url().optional(),
  orden: z.number().int().min(0).default(0),
})

export const VarianteCreateSchema = z.object({
  sku: z.string().optional(),
  precio: z.number().min(0).default(0),
  cantidadStock: z.number().int().min(0).default(0),
  stockMinimo: z.number().int().min(0).default(0),
  imagenUrl: z.string().url().optional(),
  atributoValorIds: z.array(z.string()).min(1),
})

export const VarianteUpdateSchema = z.object({
  sku: z.string().optional(),
  precio: z.number().min(0).optional(),
  cantidadStock: z.number().int().min(0).optional(),
  stockMinimo: z.number().int().min(0).optional(),
  imagenUrl: z.string().url().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
})

export const PrecioVolumenCreateSchema = z.object({
  etiqueta: z.string().min(1),
  cantidad: z.number().int().min(1),
  precio: z.number().min(0),
  varianteId: z.string().optional(),
})

export const OpcionCreateSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().min(0).default(0),
})

export const OpcionUpdateSchema = OpcionCreateSchema.partial()

export const OfertaCreateSchema = z.object({
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  precioOferta: z.number().min(0),
  varianteId: z.string().optional(),
  etiquetaVariante: z.string().optional(),
  descuento: z.number().min(0).default(0),
})

export const OfertaUpdateSchema = z.object({
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
  precioOferta: z.number().min(0).optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
})

export const VerificarCodigoQuerySchema = z.object({
  codigo: z.string().min(1, "codigo es requerido"),
})

export const ConfirmarVarianteItemSchema = z.object({
  atributoValorIds: z.array(z.string().min(1)).min(1),
  precio: z.number().min(0).optional(),
  cantidadStock: z.number().int().min(0).optional(),
  imagenUrl: z.string().url().optional(),
})

export const ConfirmarVariantesBodySchema = z.object({
  variantes: z.array(ConfirmarVarianteItemSchema).min(1, "Se requiere al menos una variante"),
})

export const AltaMasivaBodySchema = z.object({
  claProductoIds: z.array(z.string().min(1)).min(1, "Se requiere al menos una plantilla del catálogo maestro"),
})
