import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import type { IConsultorioSocialNotificador } from "../../domain/ports/IConsultorioSocialNotificador.js"
import { ConsultorioSocialNoActivoError } from "../../domain/consultorio-social.errors.js"

export class PublicarNovedadConsultorioUseCase {
  constructor(
    private readonly repo: IConsultorioSocialRepository,
    private readonly notificador: IConsultorioSocialNotificador,
  ) {}

  async ejecutar(
    slug: string,
    autorId: string,
    rol: string,
    data: { titulo?: string; contenido: string; tipo: string; etiquetas?: string[]; medios?: { tipo: string; url?: string; embedUrl?: string }[] },
  ) {
    if (rol !== "PROPIETARIO" && rol !== "owner" && rol !== "ADMIN") {
      throw Object.assign(new Error("Solo PROPIETARIO o ADMIN pueden publicar novedades"), { code: "SOLO_PROPIETARIO_ADMIN" })
    }
    let info: { consultorioId: string; tenantId: string }
    try {
      info = await this.repo.resolveConsultorioInfo(slug)
    } catch {
      throw new ConsultorioSocialNoActivoError(slug)
    }
    void info.consultorioId
    const publicacion = await this.repo.crearPublicacion({ tenantId: info.tenantId, autorId, ...data })
    this.notificador.emitirNuevaPublicacion(info.tenantId, { consultorioSlug: slug, publicacionId: publicacion.id })
    return publicacion
  }
}
