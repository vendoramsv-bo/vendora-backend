import type { ITenantRepository, MiembroDTO, ListResult } from "../domain/ports/ITenantRepository.js"
import type { QueryParams } from "../../../core/query-params.js"

export class ListarMiembrosUseCase {
  constructor(private readonly repo: ITenantRepository) {}

  async ejecutar(tenantId: string, params: QueryParams): Promise<ListResult<MiembroDTO>> {
    return this.repo.listarMiembros(tenantId, params)
  }
}
