import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import { ConsultorioSocialNoActivoError } from "../../domain/consultorio-social.errors.js"

export class ToggleFavoritoConsultorioUseCase {
  constructor(private readonly repo: IConsultorioSocialRepository) {}

  async ejecutar(slug: string, userId: string) {
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    return this.repo.toggleFavorito(info.consultorioId, userId)
  }
}
