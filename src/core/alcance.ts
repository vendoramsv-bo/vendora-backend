import { esPropietario } from "./hono-context.js"

/**
 * Alcance de los datos que ve una persona (023 data-model §5).
 *
 * **No se recibe del cliente.** Ningún endpoint acepta `tenantMemberId`,
 * `miembroId` ni equivalente en el query string o el body: el servidor lo
 * deriva de la sesión (FR-014, research R-05). Un parámetro cumpliría la letra
 * del requisito —el filtro correría en la base— y rompería su sentido:
 * cualquiera podría pedir los números de un compañero cambiando un valor en la
 * URL, y la privacidad que se edita en la barra de direcciones no es privacidad.
 */
export type Alcance =
  | { tipo: "negocio" }
  | { tipo: "propio"; tenantMemberId: string }

/**
 * Una sola regla, un solo lugar.
 *
 * PROPIETARIO y ADMIN ven todo el negocio; **cualquier otro rol, incluido el no
 * reconocido, ve solo lo suyo**. El fallback cierra, nunca abre: un rol que el
 * sistema no entiende no puede terminar viendo más que uno que sí entiende.
 */
export function derivarAlcance(rol: string | null | undefined, tenantMemberId: string): Alcance {
  if (rol && (esPropietario(rol) || rol === "ADMIN")) return { tipo: "negocio" }
  return { tipo: "propio", tenantMemberId }
}

/**
 * Traduce el alcance a la cláusula `where` de Prisma.
 *
 * **PROHIBIDO** devolver `OR: [{ tenantMemberId: id }, { tenantMemberId: null }]`.
 * La igualdad SQL ya excluye los NULL, y eso es exactamente lo que FR-019 pide:
 * una operación sin autor no es de nadie en particular, y atribuírsela a alguien
 * sería contarle en su panel una venta que no registró. En alcance `negocio` no
 * hay filtro, así que los NULL se cuentan ahí, que es donde corresponde.
 */
export function whereDeAlcance(alcance: Alcance): { tenantMemberId?: string } {
  return alcance.tipo === "propio" ? { tenantMemberId: alcance.tenantMemberId } : {}
}
