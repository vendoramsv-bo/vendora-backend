export interface INotificadorInvitacion {
  enviarInvitacion(datos: { email: string; invitacionId: string; nombreNegocio: string }): Promise<void>
}
