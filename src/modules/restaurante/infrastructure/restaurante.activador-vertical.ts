import type { IActivadorVertical } from "../../tenant/domain/ports/IActivadorVertical.js"
import { RestaurantePublicoPrismaRepository } from "./restaurante-publico.prisma.repository.js"
import { getRestaurantePublicoNotificador } from "./restaurante-publico.notificador.provider.js"
import { ActivarPerfilPublicoUseCase } from "../application/perfil-publico/activar-perfil-publico.usecase.js"
import { DesactivarPerfilPublicoUseCase } from "../application/perfil-publico/desactivar-perfil-publico.usecase.js"

export class RestauranteActivadorVertical implements IActivadorVertical {
  async activar(tenantId: string, actorUserId: string) {
    await new ActivarPerfilPublicoUseCase(new RestaurantePublicoPrismaRepository(), getRestaurantePublicoNotificador()).ejecutar(
      tenantId,
      actorUserId,
    )
  }

  // El slug solo se usa para notificar; mismo fallback que POST /api/restaurante/desactivar.
  async desactivar(tenantId: string) {
    const repo = new RestaurantePublicoPrismaRepository()
    let slug = tenantId
    try {
      const config = await repo.obtenerConfiguracion(tenantId)
      slug = (await repo.obtenerPerfilPublico(config.restauranteId))?.slug ?? tenantId
    } catch {
      // sin perfil público configurado: se notifica con el id del negocio
    }
    await new DesactivarPerfilPublicoUseCase(repo, getRestaurantePublicoNotificador()).ejecutar(tenantId, slug)
  }
}
