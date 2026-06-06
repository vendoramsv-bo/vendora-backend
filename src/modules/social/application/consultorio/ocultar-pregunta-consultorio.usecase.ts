import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import { ConsultorioSocialNoActivoError, PreguntaNoEncontradaError } from "../../domain/consultorio-social.errors.js"

const ROLES_PERMITIDOS = ["PROPIETARIO", "owner", "ADMIN"]

export class OcultarPreguntaConsultorioUseCase {
  constructor(private readonly repo: IConsultorioSocialRepository) {}

  async ejecutar(slug: string, preguntaId: string, rol: string) {
    if (!ROLES_PERMITIDOS.includes(rol)) throw new PreguntaNoEncontradaError(preguntaId)
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    const pregunta = await this.repo.ocultarPregunta(preguntaId, info.consultorioId)
    return { id: pregunta.id, estado: pregunta.estado }
  }
}
