import type { IPublicacionRepository } from "../../domain/ports/IPublicacionRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"
import { PublicacionNoEncontrada } from "../../domain/social.errors.js"

export class ReaccionarPublicacionUseCase {
  constructor(
    private readonly repo: IPublicacionRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(publicacionId: string, userId: string, tipo: string) {
    const raw = await this.repo.findById(publicacionId)
    if (!raw) throw new PublicacionNoEncontrada(publicacionId)

    const { reaccion, removed } = await this.repo.upsertReaccionPublicacion(publicacionId, userId, tipo)

    this.notificador.reaccionCreada(raw.tenantId, {
      elementoTipo: "PUBLICACION",
      elementoId: publicacionId,
      tenantId: raw.tenantId,
      userId,
      tipo,
      removed,
      fecha: new Date().toISOString(),
    })

    if (removed) return { removed: true }
    return reaccion
  }
}
