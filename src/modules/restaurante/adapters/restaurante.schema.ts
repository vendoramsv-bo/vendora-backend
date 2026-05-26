import { z } from "zod"
import { makeQueryParamsSchema } from "../../../core/query-params.js"

export const HoraSchema = z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)")

export const RestaurantePerfilSchema = z.object({
  capacidadMesas: z.number().int().min(1).optional(),
  capacidadComensales: z.number().int().min(1).optional(),
  duracionPromedioMin: z.number().int().min(1).optional(),
  tipoServicio: z.string().optional(),
  publicacionAutomatica: z.boolean().optional(),
  horaPublicacionMenu: HoraSchema.optional(),
  plantillaRRSS: z.record(z.unknown()).optional(),
})

export const TiempoComidaCreateSchema = z.object({
  nombre: z.string().min(1).max(50),
  horaInicio: HoraSchema,
  horaFin: HoraSchema,
  orden: z.number().int().min(0).default(0),
  icono: z.string().optional(),
})

export const TiempoComidaUpdateSchema = TiempoComidaCreateSchema.partial()

export const MenuCreateSchema = z.object({
  nombre: z.string().min(1).max(100),
  tipo: z.enum(["DIARIO", "SEMANAL", "ESPECIAL", "PERMANENTE", "EVENTO"]).default("DIARIO"),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  descripcion: z.string().optional(),
  tema: z.string().optional(),
})

export const MenuUpdateSchema = MenuCreateSchema.partial()

export const MenuEstadoSchema = z.object({
  estado: z.enum(["APROBADO", "PUBLICADO", "ARCHIVADO", "CANCELADO"]),
})

export const MenuItemCreateSchema = z.object({
  productoId: z.string().min(1),
  tiempoComidaId: z.string().min(1),
  precio: z.number().min(0),
  esEspecial: z.boolean().default(false),
  destacado: z.boolean().default(false),
  disponible: z.boolean().default(true),
  orden: z.number().int().min(0).default(0),
  notaMenu: z.string().optional(),
})

export const MenuItemUpdateSchema = MenuItemCreateSchema.omit({ productoId: true, tiempoComidaId: true }).partial()

export const ReservaPublicaCreateSchema = z.object({
  menuId: z.string().optional(),
  clienteEmail: z.string().email().optional(),
  clienteNombre: z.string().min(1),
  clienteTelefono: z.string().optional(),
  fechaLlegada: z.string().datetime(),
  numeroComensales: z.number().int().min(1).default(1),
  observaciones: z.string().optional(),
  canalOrigen: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string().min(1),
    cantidad: z.number().int().min(1).default(1),
    observacion: z.string().optional(),
  })).min(1),
})

export const ReservaEstadoSchema = z.object({
  estado: z.enum(["CONFIRMADA", "EN_PREPARACION", "LISTA", "ENTREGADA", "CANCELADA", "NO_ASISTIO"]),
  nota: z.string().optional(),
  numeroMesa: z.string().optional(),
})

export const PagarReservaSchema = z.object({
  cajaId: z.string().min(1),
  cajeroId: z.string().min(1),
})

export const EstadoCocinaSchema = z.object({
  estadoCocina: z.enum(["EN_PREPARACION", "LISTO", "ENTREGADO"]),
})

export const PublicacionRRSSCreateSchema = z.object({
  menuId: z.string().min(1),
  redSocial: z.enum(["INSTAGRAM", "FACEBOOK"]),
  fechaProgramada: z.string().datetime(),
})

export const QueryMenusSchema = makeQueryParamsSchema(["createdAt", "nombre", "fechaInicio", "estado"])
export const QueryReservasSchema = makeQueryParamsSchema(["createdAt", "codigo", "clienteNombre", "fechaLlegada", "estado"])
export const QueryPublicacionesSchema = makeQueryParamsSchema(["createdAt", "fechaProgramada", "redSocial", "estado"])
export const QueryTiemposComidaSchema = makeQueryParamsSchema(["orden", "nombre", "createdAt"])
