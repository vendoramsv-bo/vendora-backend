import type { TipoVertical } from "../capacidades.js"

export interface MiembroResumen {
  id: string
  userId: string
  rol: string
}

export interface MiembroDetalle {
  id: string
  userId: string
  nombreCompleto: string
  email: string
  rol: string
  estado: "activo"
  joinedAt: string
}

export interface InvitacionDetalle {
  id: string
  email: string
  rol: string
  expiresAt: string
  createdAt: string
}

export interface IMiembrosRepository {
  buscarMiembro(tenantId: string, miembroId: string): Promise<MiembroResumen | null>
  rolDeUsuario(tenantId: string, userId: string): Promise<string | null>
  contarPropietarios(tenantId: string): Promise<number>
  verticalesActivas(tenantId: string): Promise<TipoVertical[]>
  existeMiembroConEmail(tenantId: string, email: string): Promise<boolean>
  existeInvitacionPendiente(tenantId: string, email: string, ahora: Date): Promise<boolean>
  crearInvitacion(datos: {
    tenantId: string
    email: string
    rol: string
    inviterId: string
    expiresAt: Date
  }): Promise<InvitacionDetalle>
  buscarInvitacionPendiente(tenantId: string, id: string): Promise<{ id: string } | null>
  cancelarInvitacion(tenantId: string, id: string): Promise<void>
  cambiarRol(tenantId: string, miembroId: string, rol: string): Promise<MiembroDetalle>
  /** Borra la membresía y saca el negocio de las sesiones abiertas del usuario, en una transacción. */
  quitarMiembroYCerrarSesiones(tenantId: string, miembroId: string, userId: string): Promise<void>
  nombreNegocio(tenantId: string): Promise<string>
}
