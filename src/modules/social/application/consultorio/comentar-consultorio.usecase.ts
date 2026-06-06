import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import type { IConsultorioSocialNotificador } from "../../domain/ports/IConsultorioSocialNotificador.js"
import { ConsultorioSocialNoActivoError } from "../../domain/consultorio-social.errors.js"

export class ComentarConsultorioUseCase {
  constructor(
    private readonly repo: IConsultorioSocialRepository,
    private readonly notificador: IConsultorioSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, contenido: string, padreId?: string) {
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    const comentario = await this.repo.crearComentario({ consultorioId: info.consultorioId, userId, contenido, padreId })
    this.notificador.emitirNuevoComentario(info.tenantId, { consultorioSlug: slug, comentarioId: comentario.id })
    return comentario
  }
}
