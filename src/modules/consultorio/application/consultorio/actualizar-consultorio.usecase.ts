import type { IConsultorioRepository } from "../../domain/ports/IConsultorioRepository.js"
import type { ConsultorioEntity } from "../../domain/consultorio.entity.js"

export interface ConsultorioUpdateDTO {
  especialidades?: string[]
  nroRegistro?: string
}

export class ActualizarConsultorioUseCase {
  constructor(private readonly repo: IConsultorioRepository) {}

  async ejecutar(tenantId: string, data: ConsultorioUpdateDTO, userId: string): Promise<ConsultorioEntity> {
    return this.repo.upsert(tenantId, data, userId)
  }
}
