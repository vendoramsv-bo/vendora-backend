import type { IPublicacionRRSSRepository } from "../../domain/ports/IPublicacionRRSSRepository.js"
import type { IMenuRepository } from "../../domain/ports/IMenuRepository.js"
import type { PublicacionRRSSEntity } from "../../domain/publicacion-rrss.entity.js"
import { MenuNoEncontrado, MenuNoPublicado, FechaEnPasado } from "../../domain/restaurante.errors.js"
import { restauranteRRSSQueue } from "../../infrastructure/restaurante-rrss.queue.js"
import type { RRSSJobData } from "../../infrastructure/restaurante-rrss.queue.js"

export interface ProgramarPublicacionInput {
  restauranteId: string
  tenantId: string
  menuId: string
  redSocial: string
  fechaProgramada: Date
  userId: string
}

export class ProgramarPublicacionUseCase {
  constructor(
    private readonly pubRepo: IPublicacionRRSSRepository,
    private readonly menuRepo: IMenuRepository,
  ) {}

  async ejecutar(input: ProgramarPublicacionInput): Promise<PublicacionRRSSEntity> {
    if (input.fechaProgramada <= new Date()) throw new FechaEnPasado()

    const menu = await this.menuRepo.findById(input.menuId, input.restauranteId)
    if (!menu) throw new MenuNoEncontrado(input.menuId)
    if (!menu.esPublico()) throw new MenuNoPublicado()

    const pub = await this.pubRepo.create(
      {
        restauranteId: input.restauranteId,
        menuId: input.menuId,
        redSocial: input.redSocial,
        fechaProgramada: input.fechaProgramada,
        creadoPorId: input.userId,
      },
      input.userId,
    )

    const delay = input.fechaProgramada.getTime() - Date.now()
    const jobData: RRSSJobData = {
      publicacionId: pub.id,
      restauranteId: input.restauranteId,
      tenantId: input.tenantId,
    }

    await restauranteRRSSQueue.add("publicar-menu", jobData, {
      delay: Math.max(delay, 0),
      jobId: `pub:${pub.id}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 60000 },
    })

    return pub
  }
}
