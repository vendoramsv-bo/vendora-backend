import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import type { IConsultorioSocialNotificador } from "../../domain/ports/IConsultorioSocialNotificador.js"
import { ConsultorioSocialNoActivoError } from "../../domain/consultorio-social.errors.js"

export class ValorarConsultorioUseCase {
  constructor(
    private readonly repo: IConsultorioSocialRepository,
    private readonly notificador: IConsultorioSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, puntuacion: number, resena?: string) {
    if (puntuacion < 1 || puntuacion > 5) throw new Error("Puntuación debe estar entre 1 y 5")
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    const valoracion = await this.repo.upsertValoracion({ consultorioId: info.consultorioId, userId, puntuacion, resena })
    const promedio = await this.repo.getPromedioValoraciones(info.consultorioId)
    const total = (await this.repo.listarValoraciones(info.consultorioId, { take: 1, order: "desc" })).total
    this.notificador.emitirNuevaValoracion(info.tenantId, { consultorioSlug: slug, promedio, total })
    return { id: valoracion.id, puntuacion: valoracion.puntuacion, resena: valoracion.resena, promedio }
  }
}
