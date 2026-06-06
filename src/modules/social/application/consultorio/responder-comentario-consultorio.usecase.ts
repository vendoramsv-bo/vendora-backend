import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import { ConsultorioSocialNoActivoError, ComentarioNoEncontradoError } from "../../domain/consultorio-social.errors.js"

export class ResponderComentarioConsultorioUseCase {
  constructor(private readonly repo: IConsultorioSocialRepository) {}

  async ejecutar(slug: string, userId: string, contenido: string, comentarioId: string) {
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    const padre = await this.repo.findComentario(comentarioId)
    if (!padre) throw new ComentarioNoEncontradoError(comentarioId)
    if (padre.padreId !== null) throw new Error("No se pueden anidar respuestas más de 2 niveles")
    return this.repo.responderComentario({ consultorioId: info.consultorioId, userId, contenido, padreId: comentarioId })
  }
}
