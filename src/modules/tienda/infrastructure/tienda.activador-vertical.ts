import type { IActivadorVertical } from "../../tenant/domain/ports/IActivadorVertical.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { TiendaPrismaRepository } from "./tienda.prisma.repository.js"
import { getTiendaNotificador } from "./tienda.notificador.provider.js"
import { ActivarTiendaUseCase } from "../application/perfil/activar-tienda.usecase.js"
import { DesactivarTiendaUseCase } from "../application/perfil/desactivar-tienda.usecase.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const repo = () => new TiendaPrismaRepository(prisma as any)

export class TiendaActivadorVertical implements IActivadorVertical {
  async activar(tenantId: string, actorUserId: string) {
    await new ActivarTiendaUseCase(repo(), getTiendaNotificador()).execute(tenantId, actorUserId)
  }

  // La regla de la última vertical ya la aplicó CambiarCapacidadUseCase.
  async desactivar(tenantId: string) {
    await new DesactivarTiendaUseCase(repo()).execute(tenantId)
  }
}
