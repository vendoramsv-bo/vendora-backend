import type { IReservaRepository } from "../../domain/ports/IReservaRepository.js"
import type { ReservaEntity } from "../../domain/reserva.entity.js"

export class ListarReservasClienteUseCase {
  constructor(private readonly repo: IReservaRepository) {}

  async ejecutar(restauranteId: string, email: string, codigo?: string): Promise<ReservaEntity[]> {
    const reservas = await this.repo.findByClienteEmail(restauranteId, email)
    if (codigo) {
      return reservas.filter((r) => r.codigo === codigo)
    }
    return reservas
  }
}
