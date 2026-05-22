import type { IServicioMedicoRepository } from "../../domain/ports/IServicioMedicoRepository.js"
import type { ListResult } from "../../domain/ports/IMedicoRepository.js"
import type { ServicioMedicoEntity } from "../../domain/servicio-medico.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarServiciosUseCase {
  constructor(private readonly repo: IServicioMedicoRepository) {}

  async ejecutar(consultorioId: string, params: QueryParams): Promise<ListResult<ServicioMedicoEntity>> {
    return this.repo.listar(consultorioId, params)
  }
}
