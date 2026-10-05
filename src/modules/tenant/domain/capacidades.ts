import { UltimaVerticalError } from "./tenant.errors.js"

export const TIPOS_VERTICAL = ["tienda", "consultorio", "restaurante"] as const
export type TipoVertical = (typeof TIPOS_VERTICAL)[number]

export function validarDesactivacion(activas: readonly TipoVertical[], tipo: TipoVertical): void {
  if (activas.includes(tipo) && activas.length <= 1) throw new UltimaVerticalError()
}
