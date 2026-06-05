import type { IRestaurantePublicoRepository, ActivarRestauranteResultDTO } from "../../domain/ports/IRestaurantePublicoRepository.js"
import type { IRestaurantePublicoNotificador } from "../../domain/ports/IRestaurantePublicoNotificador.js"

export class ActivarPerfilPublicoUseCase {
  constructor(
    private readonly repo: IRestaurantePublicoRepository,
    private readonly notificador: IRestaurantePublicoNotificador,
  ) {}

  async ejecutar(tenantId: string, createdById?: string): Promise<ActivarRestauranteResultDTO> {
    const resultado = await this.repo.activar(tenantId, createdById)
    this.notificador.notificarPerfilActualizado(tenantId, resultado.slug, "activacion")
    return resultado
  }
}
