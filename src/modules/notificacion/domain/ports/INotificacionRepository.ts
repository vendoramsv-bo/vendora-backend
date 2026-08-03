export interface NotificacionDTO {
  id: string
  titulo: string
  mensaje: string
  fecha: string
  leida: boolean
  referenciaTipo: string | null
  referenciaId: string | null
}

export interface CrearNotificacionDTO {
  tenantId: string
  /** A quién le concierne. */
  userId: string
  /** Quién la provocó. Puede ser la misma persona. */
  actorUserId: string
  titulo: string
  mensaje: string
  referenciaTipo?: string | null
  referenciaId?: string | null
}

export interface INotificacionRepository {
  listarPorUsuario(userId: string, params: { take: number; page: number }): Promise<{
    data: NotificacionDTO[]
    total: number
  }>
  contarNoLeidas(userId: string): Promise<number>
  /** Devuelve `null` si la notificación no es de ese usuario — no se filtra ajena. */
  marcarLeida(id: string, userId: string): Promise<NotificacionDTO | null>
  crear(dto: CrearNotificacionDTO): Promise<NotificacionDTO>
}
