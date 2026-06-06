import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import { ConsultorioSocialNoActivoError } from "../../domain/consultorio-social.errors.js"

export class ListarComentariosConsultorioUseCase {
  constructor(private readonly repo: IConsultorioSocialRepository) {}

  async ejecutar(slug: string, params: { take: number; cursor?: string; order?: "asc" | "desc" }) {
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    return this.repo.listarComentarios(info.consultorioId, { take: params.take, cursor: params.cursor, order: params.order ?? "desc" })
  }
}
