import type { TipoVertical } from "./capacidades.js"
import { SoloPropietarioError, UnicoPropietarioError } from "./tenant.errors.js"

// Constitución, Art. VII.2. PROPIETARIO y ADMIN se suman siempre: administran el
// negocio sea cual sea la vertical.
const ROLES_ADMINISTRACION = ["PROPIETARIO", "ADMIN"] as const

const ROLES_POR_VERTICAL: Record<TipoVertical, readonly string[]> = {
  tienda: ["PROPIETARIO", "ADMIN", "VENDEDOR", "BODEGUERO"],
  consultorio: ["ADMIN", "MEDICO", "RECEPCIONISTA"],
  restaurante: ["PROPIETARIO", "ADMIN", "ENCARGADO", "VENDEDOR", "CHEF", "MESERO"],
}

export function rolesAsignables(verticales: readonly TipoVertical[]): string[] {
  const roles = new Set<string>(ROLES_ADMINISTRACION)
  for (const v of verticales) for (const r of ROLES_POR_VERTICAL[v]) roles.add(r)
  return [...roles]
}

// Better-Auth guarda "owner" para quien crea el negocio; en el dominio es PROPIETARIO.
export function normalizarRol(rol: string): string {
  return rol === "owner" ? "PROPIETARIO" : rol
}

/**
 * `rolNuevo = null` significa quitar al miembro del negocio.
 * `cantidadPropietarios` cuenta los propietarios actuales, incluido el objetivo.
 */
export function validarCambioDeRol(
  actorRol: string,
  rolActualObjetivo: string,
  rolNuevo: string | null,
  cantidadPropietarios: number,
): void {
  const actorEsPropietario = normalizarRol(actorRol) === "PROPIETARIO"
  const objetivoEsPropietario = normalizarRol(rolActualObjetivo) === "PROPIETARIO"
  const nuevoEsPropietario = rolNuevo !== null && normalizarRol(rolNuevo) === "PROPIETARIO"

  if ((objetivoEsPropietario || nuevoEsPropietario) && !actorEsPropietario) {
    throw new SoloPropietarioError()
  }
  if (objetivoEsPropietario && !nuevoEsPropietario && cantidadPropietarios <= 1) {
    throw new UnicoPropietarioError()
  }
}
