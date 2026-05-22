import type { IConsultorioRepository } from "../../domain/ports/IConsultorioRepository.js"
import type { ConsultorioEntity } from "../../domain/consultorio.entity.js"

export class ObtenerConsultorioUseCase {
  constructor(private readonly repo: IConsultorioRepository) {}

  async ejecutar(tenantId: string): Promise<ConsultorioEntity> {
    return this.repo.obtenerPorTenantId(tenantId)
  }
}
