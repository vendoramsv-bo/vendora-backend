import type { IRestaurantePublicoRepository } from "../../domain/ports/IRestaurantePublicoRepository.js"
import type { IRestaurantePublicoNotificador } from "../../domain/ports/IRestaurantePublicoNotificador.js"

export class DesactivarPerfilPublicoUseCase {
  constructor(
    private readonly repo: IRestaurantePublicoRepository,
    private readonly notificador: IRestaurantePublicoNotificador,
  ) {}

  async ejecutar(tenantId: string, slug: string): Promise<{ esRestaurante: false }> {
    await this.repo.desactivar(tenantId)
    this.notificador.notificarPerfilActualizado(tenantId, slug, "desactivacion")
    return { esRestaurante: false }
  }
}
