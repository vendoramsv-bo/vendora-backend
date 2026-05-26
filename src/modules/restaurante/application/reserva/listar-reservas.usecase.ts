import type { IReservaRepository, ReservaQueryParams } from "../../domain/ports/IReservaRepository.js"
import type { ReservaEntity } from "../../domain/reserva.entity.js"

export class ListarReservasUseCase {
  constructor(private readonly repo: IReservaRepository) {}

  async ejecutar(restauranteId: string, params: ReservaQueryParams = {}): Promise<ReservaEntity[]> {
    return this.repo.findAllByRestaurante(restauranteId, params)
  }
}
