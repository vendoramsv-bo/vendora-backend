import type { TipoVertical } from "../capacidades.js"

/**
 * `tenant` es núcleo y no puede importar verticales (Art. II.1): cada vertical
 * registra su implementación al arrancar, envolviendo sus propios casos de uso.
 */
export interface IActivadorVertical {
  activar(tenantId: string, actorUserId: string): Promise<void>
  desactivar(tenantId: string, actorUserId: string): Promise<void>
}

export interface ILectorVerticales {
  verticalesActivas(tenantId: string): Promise<TipoVertical[]>
}
