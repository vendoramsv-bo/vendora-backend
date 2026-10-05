import { z } from "@hono/zod-openapi"
import type { Context } from "hono"
import { makeQueryParamsSchema } from "../../../core/query-params.js"
import { requireAuth, requireTenantActivo, requireRol } from "../../../core/hono-context.js"
import { ErrorConfiguracion } from "../domain/tenant.errors.js"

// ─── Comunes ──────────────────────────────────────────────────────────────────

// Igual a `telefonoBolivianoSchema` del frontend (packages/shared/src/validators.ts).
export const TelefonoBolivianoSchema = z.string().regex(/^\d{7,8}$/, "Teléfono inválido (7 u 8 dígitos)")

export const IdParamSchema = z.object({ id: z.string() })

export const ReordenarSchema = z.object({ ids: z.array(z.string()).min(1) })

// Default 100: la pantalla necesita la lista completa para arrastrar y soltar,
// y el tope de 100 elementos por lista (domain/lista-ordenada.ts) lo garantiza.
export const QueryListaOrdenadaSchema = makeQueryParamsSchema(["orden", "createdAt"])
  .omit({ filterField: true, filterOp: true, filterValue: true, orderBy: true, order: true })
  .extend({ take: z.coerce.number().int().min(1).max(100).default(100) })

export const QueryListaSchema = makeQueryParamsSchema(["createdAt"])
  .omit({ filterField: true, filterOp: true, filterValue: true, orderBy: true, order: true })

// ─── Guards y errores ─────────────────────────────────────────────────────────

export const LECTURA = [requireAuth, requireTenantActivo]
export const ESCRITURA = [requireAuth, requireTenantActivo, requireRol(["PROPIETARIO", "ADMIN"])]
export const SOLO_PROPIETARIO = [requireAuth, requireTenantActivo, requireRol(["PROPIETARIO"])]

export function responderError(c: Context, err: unknown) {
  if (err instanceof ErrorConfiguracion) {
    return c.json({ error: err.code, message: err.message }, err.statusCode)
  }
  throw err
}

// ─── Miembros e invitaciones (US1) ────────────────────────────────────────────

export const ROLES = [
  "PROPIETARIO", "ADMIN", "VENDEDOR", "BODEGUERO", "MEDICO", "RECEPCIONISTA", "ENCARGADO", "CHEF", "MESERO",
] as const

export const InvitarSchema = z.object({
  email: z.string().email(),
  rol: z.enum(ROLES),
})

export const CambiarRolSchema = z.object({ rol: z.enum(ROLES) })

export const MiembroSchema = z.object({
  id: z.string(),
  userId: z.string(),
  nombreCompleto: z.string(),
  email: z.string(),
  rol: z.string(),
  estado: z.literal("activo"),
  joinedAt: z.string(),
})

export const InvitacionSchema = z.object({
  id: z.string(),
  email: z.string(),
  rol: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
})

// ─── Contenido ordenado (US2) ─────────────────────────────────────────────────

export const QueryListaOrdenadaSinBusquedaSchema = QueryListaOrdenadaSchema.omit({ search: true })

export const DescripcionSchema = z.object({
  id: z.string(),
  contenido: z.string(),
  orden: z.number().int(),
  createdAt: z.string(),
})
export const CrearDescripcionSchema = z.object({ contenido: z.string().trim().min(1).max(500) })

export const ImagenLocalSchema = z.object({
  id: z.string(),
  url: z.string(),
  descripcion: z.string().optional(),
  orden: z.number().int(),
  createdAt: z.string(),
})
export const CrearImagenSchema = z.object({
  url: z.string().url(),
  descripcion: z.string().max(200).optional(),
})

export const MiembroEquipoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  cargo: z.string(),
  telefono: z.string().optional(),
  domicilio: z.string().optional(),
  fotoUrl: z.string().optional(),
  orden: z.number().int(),
  createdAt: z.string(),
})
// telefono y fotoUrl aceptan "" (el formulario manda vacío cuando no se completa).
export const CrearEquipoSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  cargo: z.string().trim().min(2).max(100),
  telefono: TelefonoBolivianoSchema.or(z.literal("")).optional(),
  domicilio: z.string().max(200).optional(),
  fotoUrl: z.string().url().or(z.literal("")).optional(),
})
export const EditarEquipoSchema = CrearEquipoSchema.partial()

// ─── Localizaciones (US3) ─────────────────────────────────────────────────────

export const LocalizacionSchema = z.object({
  id: z.string(),
  latitud: z.number(),
  longitud: z.number(),
  direccion: z.string(),
  barrio: z.string().optional(),
  ciudad: z.string(),
  departamento: z.string(),
  createdAt: z.string(),
})
export const CrearLocalizacionSchema = z.object({
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
  direccion: z.string().trim().min(5).max(200),
  barrio: z.string().max(100).optional(),
  ciudad: z.string().trim().min(2).max(100),
  departamento: z.string().trim().min(2).max(100),
})
export const EditarLocalizacionSchema = CrearLocalizacionSchema.partial()

// ─── Propietario (US4) ────────────────────────────────────────────────────────

export const PropietarioSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  telefono: z.string(),
  domicilio: z.string().optional(),
  referenciaNombre: z.string().optional(),
  referenciaTelefono: z.string().optional(),
  createdAt: z.string(),
})
export const EditarPropietarioSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100),
    telefono: TelefonoBolivianoSchema,
    domicilio: z.string().max(200),
    referenciaNombre: z.string().max(100),
    referenciaTelefono: TelefonoBolivianoSchema.or(z.literal("")),
  })
  .partial()

// ─── Capacidades (US5) ────────────────────────────────────────────────────────

export const TipoVerticalParamSchema = z.object({ tipo: z.enum(["tienda", "consultorio", "restaurante"]) })
export const CapacidadSchema = z.object({ tipo: z.enum(["tienda", "consultorio", "restaurante"]), activa: z.boolean() })
export const CambiarCapacidadSchema = z.object({ activa: z.boolean() })
