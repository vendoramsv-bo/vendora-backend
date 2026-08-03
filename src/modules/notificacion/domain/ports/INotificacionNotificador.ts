/**
 * Emisión en tiempo real del contador de no leídas (spec 019 FR-033).
 *
 * Es el único evento del módulo. `@vendora/realtime` ya lo declara como
 * `notifications:unread:count` y `ShellProvider` ya lo escucha — lo que faltaba
 * era alguien que lo emitiera.
 */
export interface INotificacionNotificador {
  /** Emite el conteo al room personal del usuario, no al del tenant. */
  contadorNoLeidas(userId: string, count: number): void
}
