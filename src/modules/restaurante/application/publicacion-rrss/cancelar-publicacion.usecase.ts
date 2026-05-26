import type { IPublicacionRRSSRepository } from "../../domain/ports/IPublicacionRRSSRepository.js"
import type { PublicacionRRSSEntity } from "../../domain/publicacion-rrss.entity.js"
import { PublicacionNoEncontrada, PublicacionYaProcesada } from "../../domain/restaurante.errors.js"
import { restauranteRRSSQueue } from "../../infrastructure/restaurante-rrss.queue.js"

export class CancelarPublicacionUseCase {
  constructor(private readonly repo: IPublicacionRRSSRepository) {}

  async ejecutar(id: string, restauranteId: string, userId: string): Promise<PublicacionRRSSEntity> {
    const pub = await this.repo.findById(id, restauranteId)
    if (!pub) throw new PublicacionNoEncontrada(id)
    if (!pub.esProgramada()) throw new PublicacionYaProcesada()

    // Cancel the BullMQ job
    const job = await restauranteRRSSQueue.getJob(`pub:${id}`)
    if (job) await job.remove()

    return this.repo.update(id, { estado: "CANCELADA" }, userId)
  }
}
