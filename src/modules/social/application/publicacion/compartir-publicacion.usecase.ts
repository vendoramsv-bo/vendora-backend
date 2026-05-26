import type { IPublicacionRepository } from "../../domain/ports/IPublicacionRepository.js"
import { PublicacionNoEncontrada } from "../../domain/social.errors.js"

export class CompartirPublicacionUseCase {
  constructor(private readonly repo: IPublicacionRepository) {}

  async ejecutar(publicacionId: string, userId: string, plataforma: string) {
    const raw = await this.repo.findById(publicacionId)
    if (!raw) throw new PublicacionNoEncontrada(publicacionId)

    return this.repo.registrarCompartido({ publicacionId, userId, plataforma })
  }
}
