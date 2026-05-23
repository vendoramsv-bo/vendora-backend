import { z } from "zod"
import { makeQueryParamsSchema } from "../../../core/query-params.js"

// Query schemas para listados paginados
export const QueryParamsInventarioSchema = makeQueryParamsSchema([
  "fecha", "motivo", "estado", "tipo", "createdAt",
])

export const QueryParamsMovimientosSchema = makeQueryParamsSchema([
  "tipo", "cantidad", "motivo", "createdAt",
])

export const QueryParamsInsumoSchema = makeQueryParamsSchema([
  "nombre", "cantidadStock", "stockMinimo", "estado", "createdAt", "updatedAt",
])

export const QueryParamsAlmacenSchema = makeQueryParamsSchema([
  "fecha", "estado", "createdAt",
])

// ─── Inventario de Productos ────────────────────────────────────────────────

export const InicializarVarianteSchema = z.object({
  stockInicial: z.number().int().min(0).default(0),
  stockMinimo: z.number().int().min(0).default(0),
})

export const AjusteDetalleSchema = z.object({
  productoId: z.string().min(1),
  varianteId: z.string().optional(),
  cantidadAjuste: z.number().int(),
})

export const AjusteInventarioSchema = z.object({
  motivo: z.string().min(1).optional(),
  detalles: z.array(AjusteDetalleSchema).min(1),
})

export const RecuentoDetalleSchema = z.object({
  productoId: z.string().min(1),
  varianteId: z.string().optional(),
  stockFisico: z.number().int().min(0),
})

export const RecuentoInventarioSchema = z.object({
  observacion: z.string().optional(),
  detalles: z.array(RecuentoDetalleSchema).min(1),
})

// ─── Insumos ─────────────────────────────────────────────────────────────────

export const CrearInsumoSchema = z.object({
  nombre: z.string().min(1),
  unidadMedidaId: z.string().min(1),
  stockMinimo: z.number().min(0).default(0),
  costoUnitario: z.number().min(0).default(0),
  fechaVencimiento: z.string().datetime().optional(),
})

export const ActualizarInsumoSchema = z.object({
  nombre: z.string().min(1).optional(),
  unidadMedidaId: z.string().optional(),
  stockMinimo: z.number().min(0).optional(),
  costoUnitario: z.number().min(0).optional(),
  fechaVencimiento: z.string().datetime().nullable().optional(),
})

export const CambiarEstadoInsumoSchema = z.object({
  estado: z.enum(["ACTIVO", "INACTIVO"]),
})

export const AjusteInsumoSchema = z.object({
  cantidadAjuste: z.number(),
  motivo: z.string().min(1),
})

// ─── Ingreso y Salida de Almacén ─────────────────────────────────────────────

export const IngresoDetalleSchema = z.object({
  insumoId: z.string().min(1),
  cantidad: z.number().positive(),
  costoUnitario: z.number().min(0).default(0),
  lote: z.string().optional(),
  fechaVencimiento: z.string().datetime().optional(),
  observaciones: z.string().optional(),
})

export const CrearIngresoSchema = z.object({
  proveedorId: z.string().min(1),
  descripcion: z.string().optional(),
  detalles: z.array(IngresoDetalleSchema).min(1),
})

export const SalidaDetalleSchema = z.object({
  insumoId: z.string().min(1),
  cantidad: z.number().positive(),
})

export const CrearSalidaSchema = z.object({
  descripcion: z.string().optional(),
  detalles: z.array(SalidaDetalleSchema).min(1),
  forzar: z.boolean().default(false),
})

export const RecuentoAlmacenDetalleSchema = z.object({
  insumoId: z.string().min(1),
  stockFisico: z.number().min(0),
})

export const RecuentoAlmacenSchema = z.object({
  observacion: z.string().optional(),
  detalles: z.array(RecuentoAlmacenDetalleSchema).min(1),
})

// ─── Recetas ─────────────────────────────────────────────────────────────────

export const RecetaLineaSchema = z.object({
  insumoId: z.string().min(1),
  cantidad: z.number().positive(),
})

export const DefinirRecetaSchema = z.object({
  lineas: z.array(RecetaLineaSchema).min(1),
})

// ─── Consumo ─────────────────────────────────────────────────────────────────

export const ConsumirProductoSchema = z.object({
  productoId: z.string().min(1),
  varianteId: z.string().min(1),
  cantidad: z.number().int().positive(),
  motivo: z.string().optional(),
  forzar: z.boolean().default(false),
})
