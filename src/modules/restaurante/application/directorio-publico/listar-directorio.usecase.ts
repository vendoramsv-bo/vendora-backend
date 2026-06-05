import type { IRestaurantePublicoRepository, DirectorioRestauranteQueryDTO, DirectorioRestauranteResultDTO } from "../../domain/ports/IRestaurantePublicoRepository.js"

export class ListarDirectorioUseCase {
  constructor(private readonly repo: IRestaurantePublicoRepository) {}

  async ejecutar(params: DirectorioRestauranteQueryDTO): Promise<DirectorioRestauranteResultDTO> {
    return this.repo.listarDirectorio(params)
  }
}
