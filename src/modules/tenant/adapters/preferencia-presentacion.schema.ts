import { z } from "zod"

/**
 * Contrato HTTP de la preferencia de presentación del negocio.
 *
 * REGLA CENTRAL — **el JSON viaja en minúscula**. El enumerado de Prisma es
 * `CLAY`, `VERDE`, …, pero el cliente trabaja con los ids canónicos `"clay"`,
 * `"verde"`. La traducción va en los dos sentidos y vive en este archivo.
 *
 * Sin esta regla, `resolverTema("CLAY")` del frontend caería en la rama de
 * "valor desconocido" y descartaría **en silencio** el tema que el negocio
 * eligió: rompería FR-018 y SC-015 sin producir ningún error visible, que es la
 * peor clase de falla posible.
 */

// ─── Ids canónicos (lo que viaja por HTTP) ────────────────────────────────────

export const TEMAS = ["clay", "verde", "azul", "violeta", "rosa", "dorado", "slate"] as const
export const LINEADOS = ["curva", "recta", "guiones", "zigzag", "ninguno"] as const
export const DESPLIEGUES = ["barra_lateral", "barra_superior", "barra_inferior"] as const

export const TemaSchema = z.enum(TEMAS)
export const LineadoSchema = z.enum(LINEADOS)
export const DespliegueSchema = z.enum(DESPLIEGUES)

export type IdTema = (typeof TEMAS)[number]
export type IdLineado = (typeof LINEADOS)[number]
export type IdDespliegue = (typeof DESPLIEGUES)[number]

// ─── Traducción enumerado ↔ id canónico ───────────────────────────────────────

/** `CLAY` → `"clay"`. Total: cualquier valor desconocido cae en `"clay"`. */
export const aIdTema = (enumerado: string | null | undefined): IdTema => {
  const id = String(enumerado ?? "").toLowerCase()
  return (TEMAS as readonly string[]).includes(id) ? (id as IdTema) : "clay"
}

/** `"clay"` → `CLAY`. */
export const aEnumTema = (id: IdTema): string => id.toUpperCase()

export const aIdLineado = (enumerado: string | null | undefined): IdLineado => {
  const id = String(enumerado ?? "").toLowerCase()
  return (LINEADOS as readonly string[]).includes(id) ? (id as IdLineado) : "curva"
}

export const aEnumLineado = (id: IdLineado): string => id.toUpperCase()

export const aIdDespliegue = (enumerado: string | null | undefined): IdDespliegue => {
  const id = String(enumerado ?? "").toLowerCase()
  return (DESPLIEGUES as readonly string[]).includes(id) ? (id as IdDespliegue) : "barra_lateral"
}

export const aEnumDespliegue = (id: IdDespliegue): string => id.toUpperCase()

// ─── Request / Response ───────────────────────────────────────────────────────

export const PreferenciaPresentacionResponseSchema = z.object({
  tema: TemaSchema,
  tipoLineado: LineadoSchema,
  tipoDespliegueVentas: DespliegueSchema,
})

export const ActualizarPreferenciaPresentacionSchema = z.object({
  tema: TemaSchema,
  tipoLineado: LineadoSchema.optional(),
  tipoDespliegueVentas: DespliegueSchema.optional(),
})

export type PreferenciaPresentacionResponse = z.infer<typeof PreferenciaPresentacionResponseSchema>
