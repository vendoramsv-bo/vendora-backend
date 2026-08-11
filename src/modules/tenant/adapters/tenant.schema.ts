import { z } from "zod"
import { makeQueryParamsSchema } from "../../../core/query-params.js"

// ─── Slug ─────────────────────────────────────────────────────────────────────

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "El slug solo admite minúsculas, dígitos y guiones")

// ─── Paginación ───────────────────────────────────────────────────────────────

export const PaginadoMetaSchema = z.object({
  take: z.number(),
  skip: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
  nextCursor: z.number().nullable(),
})

// ─── Tenant ───────────────────────────────────────────────────────────────────

export const TenantBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: SlugSchema,
  logo: z.string().nullable(),
  nombreLargo: z.string(),
  descripcion: z.string(),
  esTienda: z.boolean(),
  esConsultorio: z.boolean(),
  esRestaurante: z.boolean(),
  plan: z.string(),
  estado: z.string(),
  ultimoPasoCreacion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
})

export const PropietarioSchema = z.object({
  id: z.string(),
  nombres: z.string(),
  telefono: z.string(),
  domicilio: z.string(),
  imagenUrl: z.string().nullable().optional(),
})

export const TenantActualResponseSchema = TenantBaseSchema.extend({
  propietario: PropietarioSchema.nullable(),
})

export const ListaTenantItemSchema = z.object({
  tenant: TenantBaseSchema,
  miRol: z.string(),
})

export const ListaTenantResponseSchema = z.object({
  data: z.array(ListaTenantItemSchema),
  meta: PaginadoMetaSchema,
})

export const QueryParamsTenantSchema = makeQueryParamsSchema(["name", "createdAt"] as const)

// ─── Miembros ─────────────────────────────────────────────────────────────────

export const MiembroResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  role: z.string(),
  estado: z.string(),
  createdAt: z.string(),
  usuario: z.object({
    name: z.string(),
    email: z.string(),
    image: z.string().nullable().optional(),
  }),
})

export const ListaMiembrosResponseSchema = z.object({
  data: z.array(MiembroResponseSchema),
  meta: PaginadoMetaSchema,
})

export const QueryParamsMiembrosSchema = makeQueryParamsSchema(["createdAt", "role"] as const)

// ─── Invitaciones ─────────────────────────────────────────────────────────────

export const InvitacionResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  status: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  invitador: z.object({
    name: z.string(),
    email: z.string(),
  }),
})

export const ListaInvitacionesResponseSchema = z.object({
  data: z.array(InvitacionResponseSchema),
  meta: PaginadoMetaSchema,
})

export const QueryParamsInvitacionSchema = makeQueryParamsSchema(["status", "createdAt"] as const)

// ─── Baja del negocio (023 US3, contracts §A.4) ───────────────────────────────

/**
 * Cuerpo de `DELETE /api/tenant/actual`.
 *
 * La confirmación se valida **en el servidor además de en el cliente**: el
 * diálogo del cliente evita el accidente, el chequeo del servidor evita el
 * `curl`. Una confirmación que solo existe en la UI no es una confirmación.
 */
export const EliminarNegocioSchema = z.object({
  confirmacion: z.string().min(1),
})

export const EliminarNegocioResponseSchema = z.object({
  ok: z.boolean(),
})
