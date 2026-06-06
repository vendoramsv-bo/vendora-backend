import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import type { IConsultorioSocialNotificador } from "../../domain/ports/IConsultorioSocialNotificador.js"
import { ConsultorioSocialNoActivoError } from "../../domain/consultorio-social.errors.js"

export class PreguntarConsultorioUseCase {
  constructor(
    private readonly repo: IConsultorioSocialRepository,
    private readonly notificador: IConsultorioSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, pregunta: string) {
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    const result = await this.repo.crearPregunta({ consultorioId: info.consultorioId, userId, pregunta })
    this.notificador.emitirNuevaPregunta(info.tenantId, { consultorioSlug: slug, preguntaId: result.id })
    return result
  }
}
