import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"
import { PuntuacionInvalida } from "../../domain/social.errors.js"

export class ValorarTiendaUseCase {
  constructor(
    private readonly repo: ITiendaSocialRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, puntuacion: number, resena?: string) {
    if (puntuacion < 1 || puntuacion > 5) throw new PuntuacionInvalida()

    const tiendaId = await this.repo.resolveTiendaId(slug)
    const valoracion = await this.repo.upsertValoracionTienda({ tiendaId, userId, puntuacion, resena })
    const nuevoPromedio = await this.repo.getPromedioValoracionesTienda(tiendaId)

    this.notificador.valoracionCreada(tiendaId, {
      elementoTipo: "TIENDA",
      elementoId: tiendaId,
      tenantId: tiendaId,
      userId,
      puntuacion,
      nuevoPromedio,
      fecha: new Date().toISOString(),
    })

    return valoracion
  }
}
