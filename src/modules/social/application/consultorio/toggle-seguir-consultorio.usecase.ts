import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import type { IConsultorioSocialNotificador } from "../../domain/ports/IConsultorioSocialNotificador.js"
import { ConsultorioSocialNoActivoError } from "../../domain/consultorio-social.errors.js"

export class ToggleSeguirConsultorioUseCase {
  constructor(
    private readonly repo: IConsultorioSocialRepository,
    private readonly notificador: IConsultorioSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string) {
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    const resultado = await this.repo.toggleSeguir(info.consultorioId, userId)
    if (resultado.siguiendo) {
      this.notificador.emitirNuevoSeguidor(info.tenantId, { consultorioSlug: slug, totalSeguidores: resultado.totalSeguidores })
    }
    return resultado
  }
}
