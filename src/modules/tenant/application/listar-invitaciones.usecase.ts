import type { ITenantRepository, InvitacionDTO, ListResult } from "../domain/ports/ITenantRepository.js"
import type { QueryParams } from "../../../core/query-params.js"

// T030 — Nombre sin sufijo "pendientes": lista todas las invitaciones (todos los estados).
export class ListarInvitacionesUseCase {
  constructor(private readonly repo: ITenantRepository) {}

  async ejecutar(tenantId: string, params: QueryParams): Promise<ListResult<InvitacionDTO>> {
    return this.repo.listarInvitaciones(tenantId, params)
  }
}
