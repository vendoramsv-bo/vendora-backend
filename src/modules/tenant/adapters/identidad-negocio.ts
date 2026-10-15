import { z } from "@hono/zod-openapi"

/**
 * Identidad del negocio editable desde la configuración: el nombre y el logo.
 * Son columnas de `Tenant` mapeadas a Better-Auth Organization (`name`, `logo`),
 * así que se escriben con esos mismos nombres, iguales a los que devuelve el
 * GET /api/tenant/config (spec 036 del frontend, B1).
 *
 * El slug NO está: cambiarlo rompe la URL pública de la vitrina.
 */
export const IdentidadNegocioPatchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  // La URL sale de POST /api/tenant/upload-url con propósito `logo`.
  // `null` quita el logo.
  logo: z.string().url().nullable().optional(),
})

export type IdentidadNegocioPatch = z.infer<typeof IdentidadNegocioPatchSchema>

export function camposIdentidad(body: IdentidadNegocioPatch): Record<string, unknown> {
  const campos: Record<string, unknown> = {}
  if (body.name !== undefined) campos.name = body.name
  if (body.logo !== undefined) campos.logo = body.logo
  return campos
}

export interface ConflictoIdentidad {
  error: "CONFLICTO_UNICIDAD"
  message: string
  fieldErrors: Record<string, string>
}

/**
 * `name` y `nombreLargo` son únicos entre todos los negocios. Un choque se
 * devuelve con el error en el campo del formulario, para que el frontend lo
 * muestre ahí y no como un error genérico (constitución del frontend, XI.5).
 */
export function conflictoIdentidad(err: unknown): ConflictoIdentidad | null {
  const e = err as { code?: string; meta?: { target?: unknown } }
  if (e?.code !== "P2002") return null

  const target = Array.isArray(e.meta?.target) ? e.meta.target.join(",") : String(e.meta?.target ?? "")
  const campo = /nombreLargo/i.test(target) ? "nombreLargo" : /\bname\b|_name_/i.test(target) ? "nombre" : null
  if (!campo) return null

  const message =
    campo === "nombre" ? "Ya existe un negocio con ese nombre." : "Ya existe un negocio con ese nombre largo."
  return { error: "CONFLICTO_UNICIDAD", message, fieldErrors: { [campo]: message } }
}
