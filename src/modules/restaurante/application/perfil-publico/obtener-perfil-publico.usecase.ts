import type { IRestaurantePublicoRepository, ConfiguracionPublicaDTO } from "../../domain/ports/IRestaurantePublicoRepository.js"

export class ObtenerPerfilPublicoUseCase {
  constructor(private readonly repo: IRestaurantePublicoRepository) {}

  async ejecutar(tenantId: string): Promise<ConfiguracionPublicaDTO> {
    return this.repo.obtenerConfiguracion(tenantId)
  }
}
