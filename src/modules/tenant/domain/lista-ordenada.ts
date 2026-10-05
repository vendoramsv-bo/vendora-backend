import { OrdenDesactualizadoError } from "./tenant.errors.js"

// Con take ≤ 100 (Art. IV), una página siempre trae la lista completa, que es lo
// que la pantalla necesita para arrastrar y soltar.
export const LIMITE_LISTA = 100

// Un orden parcial o con ids ajenos se rechaza entero: aplicarlo dejaría los
// elementos omitidos en posiciones arbitrarias (p. ej. uno que otro usuario
// agregó mientras se reordenaba).
export function validarReordenamiento(idsActuales: readonly string[], idsEnviados: readonly string[]): void {
  const enviados = new Set(idsEnviados)
  const actuales = new Set(idsActuales)
  const valido =
    enviados.size === idsEnviados.length &&
    enviados.size === actuales.size &&
    idsEnviados.every((id) => actuales.has(id))
  if (!valido) throw new OrdenDesactualizadoError()
}
