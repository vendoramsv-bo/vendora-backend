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

// ─── PuntoVenta ───────────────────────────────────────────────────────────────

export const QueryParamsPuntoVentaSchema = makeQueryParamsSchema(["nombre", "tipo", "createdAt"])

export const CrearPuntoVentaSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(["CAJA", "SUCURSAL"]).default("CAJA"),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  sucursal: z.string().optional().nullable(),
})

export const ActualizarPuntoVentaSchema = z.object({
  nombre: z.string().min(1).optional(),
  tipo: z.enum(["CAJA", "SUCURSAL"]).optional(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  sucursal: z.string().optional().nullable(),
})

// ─── TurnoAtencion ────────────────────────────────────────────────────────────

export const QueryParamsTurnoSchema = makeQueryParamsSchema(["turno", "createdAt"])

export const CrearTurnoAtencionSchema = z.object({
  turno: z.string().min(1),
  descripcion: z.string().optional().nullable(),
})

export const ActualizarTurnoAtencionSchema = z.object({
  turno: z.string().min(1).optional(),
  descripcion: z.string().optional().nullable(),
})

// ─── Caja ─────────────────────────────────────────────────────────────────────

export const QueryParamsCajaSchema = makeQueryParamsSchema(["fecha", "estadoCaja", "createdAt"])

export const AbrirCajaSchema = z.object({
  puntoVentaId: z.string().min(1),
  turnoId: z.string().min(1),
  montoInicial: z.number().min(0).default(0),
})

export const CerrarCajaSchema = z.object({
  montoArqueoCaja: z.number().min(0),
})

export const RegistrarIngresoCajaSchema = z.object({
  motivo: z.string().min(1),
  montoIngreso: z.number().min(0),
})

export const RegistrarEgresoCajaSchema = z.object({
  motivo: z.string().min(1),
  montoEgreso: z.number().min(0),
})

// ─── Venta ────────────────────────────────────────────────────────────────────

export const QueryParamsVentaSchema = makeQueryParamsSchema(["fecha", "estadoPago", "tipoPago", "createdAt"])

export const VentaDetalleSchema = z.object({
  productoId: z.string().min(1),
  varianteId: z.string().optional().nullable(),
  etiquetaVariante: z.string().optional().nullable(),
  precioVolumenId: z.string().optional().nullable(),
  etiquetaVolumen: z.string().optional().nullable(),
  precio: z.number().min(0),
  cantidad: z.number().int().min(1),
  descuento: z.number().min(0).default(0),
  notaVenta: z.string().optional().nullable(),
})

export const CrearVentaSchema = z.object({
  aperturaCierreCajaId: z.string().min(1),
  puntoVentaId: z.string().min(1),
  turnoId: z.string().min(1),
  clienteId: z.string().optional().nullable(),
  clienteNombre: z.string().optional().nullable(),
  clienteTipoDocumento: z.string().optional().nullable(),
  clienteNroDocumento: z.string().optional().nullable(),
  clienteEmail: z.string().optional().nullable(),
  tipoPago: z.enum(["EFECTIVO", "QR", "TARJETA_CREDITO", "TARJETA_DEBITO", "OTRO"]),
  estadoPago: z.enum(["PAGADO", "EN_ESPERA"]).default("PAGADO"),
  efectivo: z.number().min(0).default(0),
  referenciaTipo: z.enum(["PUNTO_DE_VENTA", "PEDIDO", "VENTA_DIARIA", "OTRO"]).default("PUNTO_DE_VENTA"),
  referenciaId: z.string().optional().nullable(),
  detalles: z.array(VentaDetalleSchema).min(1),
})

export const QueryParamsReporteSchema = makeQueryParamsSchema(["fecha", "fuente", "createdAt"])

/**
 * Query params del consolidado, **declarados** para que salgan en el OpenAPI.
 *
 * El handler los leía con `c.req.query()` sin declararlos, así que el spec decía
 * `query?: never` y el cliente generado no podía enviarlos sin un
 * `@ts-expect-error`. Ese silencio del contrato es lo que dejó pasar el defecto
 * R-07 —el cliente mandaba `desde`/`hasta` y el servidor leía
 * `fechaDesde`/`fechaHasta`— durante todo este tiempo: con los nombres en el
 * spec, el desajuste habría sido un error de compilación.
 *
 * `tenantMemberId` **no está acá y no puede estarlo**: el alcance lo deriva el
 * servidor de la sesión (023 FR-014).
 */
export const QueryConsolidadoSchema = QueryParamsReporteSchema.extend({
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  fuente: z.enum(["VENTA", "CONSULTORIO"]).optional(),
  puntoVentaId: z.string().optional(),
})

// ─── Pedido ───────────────────────────────────────────────────────────────────

export const QueryParamsPedidoSchema = makeQueryParamsSchema(["fecha", "estado", "createdAt"])

export const PedidoDetalleSchema = z.object({
  productoId: z.string().min(1),
  varianteId: z.string().optional().nullable(),
  etiquetaVariante: z.string().optional().nullable(),
  precioVolumenId: z.string().optional().nullable(),
  etiquetaVolumen: z.string().optional().nullable(),
  precio: z.number().min(0),
  cantidad: z.number().int().min(1),
})

export const CrearPedidoSchema = z.object({
  detalles: z.array(PedidoDetalleSchema).min(1),
  respuesta: z.string().optional().nullable(),
})

export const ActualizarEstadoPedidoSchema = z.object({
  estado: z.enum(["PENDIENTE", "ELABORADO", "FINALIZADO", "RECHAZADO"]),
  respuesta: z.string().optional().nullable(),
})

export const ConvertirPedidoEnVentaSchema = z.object({
  aperturaCierreCajaId: z.string().min(1),
  puntoVentaId: z.string().min(1),
  turnoId: z.string().min(1),
  tipoPago: z.enum(["EFECTIVO", "QR", "TARJETA_CREDITO", "TARJETA_DEBITO", "OTRO"]),
  estadoPago: z.enum(["PAGADO", "EN_ESPERA"]).default("PAGADO"),
  efectivo: z.number().min(0).default(0),
})

// ─── Gastos ───────────────────────────────────────────────────────────────────

export const QueryParamsGastosSchema = makeQueryParamsSchema(["fecha", "estado", "createdAt"])

export const CrearGastoSchema = z.object({
  fecha: z.string().datetime(),
  motivo: z.string().min(1),
  totalGasto: z.number().min(0),
})

export const ActualizarGastoSchema = z.object({
  fecha: z.string().datetime().optional(),
  motivo: z.string().min(1).optional(),
  totalGasto: z.number().min(0).optional(),
})
