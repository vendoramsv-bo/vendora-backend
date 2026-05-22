import type { IServicioMedicoRepository, ServicioCreateDTO } from "../../domain/ports/IServicioMedicoRepository.js"
import type { ServicioMedicoEntity } from "../../domain/servicio-medico.entity.js"

export class CrearServicioUseCase {
  constructor(private readonly repo: IServicioMedicoRepository) {}

  async ejecutar(data: ServicioCreateDTO, consultorioId: string, userId: string): Promise<ServicioMedicoEntity> {
    return this.repo.crear(data, consultorioId, userId)
  }
}
