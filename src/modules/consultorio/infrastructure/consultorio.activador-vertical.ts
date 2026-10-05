import type { IActivadorVertical } from "../../tenant/domain/ports/IActivadorVertical.js"
import { ConsultorioPublicoPrismaRepository } from "./consultorio-publico.prisma.repository.js"
import { ActivarPerfilPublicoConsultorioUseCase } from "../application/perfil-publico/activar-perfil-publico.usecase.js"
import { DesactivarPerfilPublicoConsultorioUseCase } from "../application/perfil-publico/desactivar-perfil-publico.usecase.js"

export class ConsultorioActivadorVertical implements IActivadorVertical {
  async activar(tenantId: string, actorUserId: string) {
    await new ActivarPerfilPublicoConsultorioUseCase(new ConsultorioPublicoPrismaRepository()).ejecutar(tenantId, actorUserId)
  }

  async desactivar(tenantId: string, actorUserId: string) {
    await new DesactivarPerfilPublicoConsultorioUseCase(new ConsultorioPublicoPrismaRepository()).ejecutar(tenantId, actorUserId)
  }
}
