import type { IPublicacionRepository } from "../../domain/ports/IPublicacionRepository.js"
import { PublicacionNoEncontrada } from "../../domain/social.errors.js"

export class ObtenerPublicacionUseCase {
  constructor(private readonly repo: IPublicacionRepository) {}

  async ejecutar(id: string, soloPublicadas = false) {
    const raw = await this.repo.findById(id)
    if (!raw) throw new PublicacionNoEncontrada(id)
    if (soloPublicadas && raw.estado !== "PUBLICADO") throw new PublicacionNoEncontrada(id)

    const [reacciones, comentarios] = await Promise.all([
      this.repo.getReaccionesCount(id),
      this.repo.listarComentariosPublicacion(id, { take: 20, skip: 0, order: "desc" }),
    ])

    return { ...raw, reacciones, comentarios: comentarios.data, totalComentarios: comentarios.total }
  }
}
