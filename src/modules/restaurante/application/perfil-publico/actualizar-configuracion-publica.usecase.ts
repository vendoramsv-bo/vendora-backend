import type { IRestaurantePublicoRepository, ActualizarConfiguracionPublicaDTO, ConfiguracionPublicaDTO } from "../../domain/ports/IRestaurantePublicoRepository.js"
import type { IRestaurantePublicoNotificador } from "../../domain/ports/IRestaurantePublicoNotificador.js"

export class ActualizarConfiguracionPublicaUseCase {
  constructor(
    private readonly repo: IRestaurantePublicoRepository,
    private readonly notificador: IRestaurantePublicoNotificador,
  ) {}

  async ejecutar(tenantId: string, datos: ActualizarConfiguracionPublicaDTO, updatedById?: string): Promise<ConfiguracionPublicaDTO> {
    const config = await this.repo.actualizarConfiguracion(tenantId, datos, updatedById)
    const perfil = await this.repo.obtenerPerfilPublico(tenantId)
    const slug = perfil?.slug ?? tenantId
    this.notificador.notificarPerfilActualizado(tenantId, slug, "configuracion")
    return config
  }
}
