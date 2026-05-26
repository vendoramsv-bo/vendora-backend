import type { IReservaRepository } from "../../domain/ports/IReservaRepository.js"
import type { ReservaEntity } from "../../domain/reserva.entity.js"
import type { ReservaDetalleEntity } from "../../domain/reserva-detalle.entity.js"
import { ReservaNoEncontrada } from "../../domain/restaurante.errors.js"

export interface ReservaConDetalles {
  reserva: ReservaEntity
  detalles: ReservaDetalleEntity[]
}

export class ObtenerReservaUseCase {
  constructor(private readonly repo: IReservaRepository) {}

  async ejecutar(id: string, restauranteId?: string): Promise<ReservaConDetalles> {
    const result = await this.repo.findById(id, restauranteId)
    if (!result) throw new ReservaNoEncontrada(id)
    return { reserva: result, detalles: result.detalles ?? [] }
  }
}
