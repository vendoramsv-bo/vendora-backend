import type { ISocialNotificador, ReaccionPayload, ComentarioPayload, ValoracionPayload, PublicacionNuevaPayload } from "../domain/ports/ISocialNotificador.js"

export class NullSocialNotificador implements ISocialNotificador {
  reaccionCreada(_tenantId: string, _payload: ReaccionPayload): void {}
  comentarioCreado(_tenantId: string, _payload: ComentarioPayload): void {}
  valoracionCreada(_tenantId: string, _payload: ValoracionPayload): void {}
  publicacionNueva(_tenantId: string, _payload: PublicacionNuevaPayload): void {}
}
