export interface IRestaurantePublicoNotificador {
  notificarPerfilActualizado(tenantId: string, slug: string, campo?: string): void
  notificarNuevaReserva(tenantId: string, reservaId: string, codigo: string, slug: string): void
  notificarReservaActualizada(tenantId: string, reservaId: string, codigo: string, estado: string, slug: string): void
}
