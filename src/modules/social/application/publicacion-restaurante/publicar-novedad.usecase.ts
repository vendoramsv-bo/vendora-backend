import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class PublicarNovedadUseCase {
  constructor(private readonly repo: IRestauranteSocialRepository) {}

  async ejecutar(
    slug: string,
    autorId: string,
    rol: string,
    data: { titulo?: string; contenido: string; tipo: string; etiquetas?: string[]; medios?: { tipo: string; url?: string; embedUrl?: string }[] },
  ) {
    if (rol !== "PROPIETARIO" && rol !== "owner" && rol !== "ADMIN") {
      throw Object.assign(new Error("Solo PROPIETARIO o ADMIN pueden publicar novedades"), { code: "SOLO_PROPIETARIO_ADMIN" })
    }
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    void info.restauranteId
    return this.repo.crearPublicacion({ tenantId: info.tenantId, autorId, ...data })
  }
}
