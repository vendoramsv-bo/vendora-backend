import { z } from "zod"
import { makeQueryParamsSchema } from "../../../core/query-params.js"
import { ORIGENES_MOVIMIENTO, TIPOS_MOVIMIENTO_TENANT } from "../domain/movimiento-tenant.js"

// Query schemas para listados paginados
export const QueryParamsInventarioSchema = makeQueryParamsSchema([
  "fecha", "motivo", "estado", "tipo", "createdAt",
])

const CAMPOS_MOVIMIENTO_ENTIDAD = ["tipo", "cantidad", "motivo", "createdAt"] as const

export const QueryParamsMovimientosSchema = makeQueryParamsSchema([...CAMPOS_MOVIMIENTO_ENTIDAD]).extend({
  // Acotado (Art. IV): un campo libre llega al `where` de Prisma y termina en 500.
  filterField: z.enum(CAMPOS_MOVIMIENTO_ENTIDAD).optional(),
})

export const QueryParamsMovimientosTenantSchema = makeQueryParamsSchema(["tipo", "cantidad", "createdAt"]).extend({
  filterField: z.enum(["origen", "tipo", "motivo", "cantidad", "createdAt"]).optional(),
})

export const MovimientoTenantSchema = z.object({
  id: z.string(),
  origen: z.enum(ORIGENES_MOVIMIENTO),
  insumoId: z.string().nullable(),
  productoId: z.string().nullable(),
  varianteId: z.string().nullable(),
  nombreEntidad: z.string(),
  etiquetaVariante: z.string().nullable(),
  tipo: z.enum(TIPOS_MOVIMIENTO_TENANT),
  cantidad: z.number(),
  stockAntes: z.number().int(),
  stockDespues: z.number().int(),
  motivo: z.string().nullable(),
  referenciaId: z.string().nullable(),
  createdAt: z.string(),
})

// Fila tal cual la devuelve `findMany` sobre MovimientoAlmacen, sin `select`.
export const MovimientoInsumoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  insumoId: z.string(),
  tipo: z.enum(["CREACION", "INGRESO", "SALIDA", "AJUSTE", "RECUENTO"]),
  cantidad: z.string(), // Decimal(10,4) serializado por c.json
  motivo: z.string().nullable(),
  referenciaId: z.string().nullable(),
  stockAntes: z.number().int(),
  stockDespues: z.number().int(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
})

// Fila tal cual la devuelve `findMany` sobre MovimientoInventario, sin `select`.
export const MovimientoVarianteSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  productoId: z.string(),
  varianteId: z.string().nullable(),
  etiquetaVariante: z.string().nullable(),
  tipo: z.enum(["CREACION", "ENTRADA", "SALIDA", "AJUSTE", "RECUENTO"]),
  cantidad: z.number().int(),
  motivo: z.string().nullable(),
  referenciaId: z.string().nullable(),
  stockAntes: z.number().int(),
  stockDespues: z.number().int(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
})

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

// ─── Nuevos schemas borrador-aprobación ─────────────────────────────────────

export const CrearAjusteSchema = z.object({
  motivo: z.string().min(1).optional(),
  detalles: z.array(AjusteDetalleSchema).min(1),
})

export const ActualizarAjusteSchema = z.object({
  motivo: z.string().min(1).optional(),
  detalles: z.array(AjusteDetalleSchema).optional(),
})

export const AprobarDocumentoSchema = z.object({
  version: z.number().int().min(0),
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

export const CrearRecuentoSchema = z.object({
  observacion: z.string().optional(),
  detalles: z.array(RecuentoDetalleSchema).min(1),
})

export const ActualizarRecuentoSchema = z.object({
  observacion: z.string().optional(),
  detalles: z.array(RecuentoDetalleSchema).optional(),
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
  motivo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  detalles: z.array(SalidaDetalleSchema).min(1),
  forzar: z.boolean().default(false),
})

export const ActualizarIngresoSchema = z.object({
  proveedorId: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  detalles: z.array(IngresoDetalleSchema).optional(),
})

export const ActualizarSalidaSchema = z.object({
  motivo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  detalles: z.array(SalidaDetalleSchema).optional(),
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
