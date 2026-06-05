import type { IRestaurantePublicoRepository, MisReservasQueryDTO } from "../../domain/ports/IRestaurantePublicoRepository.js"

export class ListarMisReservasUseCase {
  constructor(private readonly repo: IRestaurantePublicoRepository) {}

  async ejecutar(query: MisReservasQueryDTO) {
    return this.repo.listarMisReservas(query)
  }
}
