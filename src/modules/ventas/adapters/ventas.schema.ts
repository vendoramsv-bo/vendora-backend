import { z } from "zod"
import { makeQueryParamsSchema } from "../../../core/query-params.js"

// ─── Query Params ─────────────────────────────────────────────────────────────

export const QueryParamsClienteSchema = makeQueryParamsSchema(["nombre", "createdAt"])

export const QueryParamsProveedorSchema = makeQueryParamsSchema(["nombre", "createdAt"])

export const QueryParamsCompraSchema = makeQueryParamsSchema(["fecha", "createdAt"])

// ─── Cliente ──────────────────────────────────────────────────────────────────

export const CrearClienteSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  diaNacimiento: z.number().int().min(1).max(31).optional().nullable(),
  mesNacimiento: z.number().int().min(1).max(12).optional().nullable(),
})

export const ActualizarClienteSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  diaNacimiento: z.number().int().min(1).max(31).optional().nullable(),
  mesNacimiento: z.number().int().min(1).max(12).optional().nullable(),
})

export const CambiarEstadoSchema = z.object({
  estado: z.enum(["ACTIVO", "INACTIVO"]),
})

// ─── Proveedor ────────────────────────────────────────────────────────────────

export const CrearProveedorSchema = z.object({
  nombre: z.string().min(1),
  nit: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  sitioWeb: z.string().optional().nullable(),
  productosOfrece: z.string().optional().nullable(),
})

export const ActualizarProveedorSchema = z.object({
  nombre: z.string().min(1).optional(),
  nit: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  sitioWeb: z.string().optional().nullable(),
  productosOfrece: z.string().optional().nullable(),
})

// ─── Compra ───────────────────────────────────────────────────────────────────

export const CompraDetalleSchema = z.object({
  productoId: z.string().min(1),
  varianteId: z.string().optional().nullable(),
  etiquetaVariante: z.string().optional().nullable(),
  cantidad: z.number().int().min(1),
  precio: z.number().min(0).default(0),
  precioEstimadoVenta: z.number().min(0).default(0),
})

export const CompraCostoSchema = z.object({
  motivo: z.string().min(1),
  costo: z.number().min(0),
})

export const CrearCompraSchema = z.object({
  proveedorId: z.string().min(1),
  fecha: z.string().datetime().optional(),
  descripcion: z.string().optional().nullable(),
  detalles: z.array(CompraDetalleSchema).min(1),
  costosAdicionales: z.array(CompraCostoSchema).optional().default([]),
})

export const ActualizarCompraSchema = z.object({
  proveedorId: z.string().optional(),
  fecha: z.string().datetime().optional(),
  descripcion: z.string().optional().nullable(),
})

export const ActualizarDetalleSchema = z.object({
  cantidad: z.number().int().min(1).optional(),
  precio: z.number().min(0).optional(),
  precioEstimadoVenta: z.number().min(0).optional(),
})

export const ActualizarCostoSchema = z.object({
  costo: z.number().min(0),
})
