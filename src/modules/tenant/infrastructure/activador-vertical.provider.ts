import type { TipoVertical } from "../domain/capacidades.js"
import type { IActivadorVertical } from "../domain/ports/IActivadorVertical.js"

const activadores = new Map<TipoVertical, IActivadorVertical>()

export function registrarActivadorVertical(tipo: TipoVertical, activador: IActivadorVertical): void {
  activadores.set(tipo, activador)
}

export function obtenerActivadorVertical(tipo: TipoVertical): IActivadorVertical | null {
  return activadores.get(tipo) ?? null
}
