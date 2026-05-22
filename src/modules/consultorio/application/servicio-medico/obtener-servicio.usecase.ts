import type { IServicioMedicoRepository } from "../../domain/ports/IServicioMedicoRepository.js"
import type { ServicioMedicoEntity } from "../../domain/servicio-medico.entity.js"

export class ObtenerServicioUseCase {
  constructor(private readonly repo: IServicioMedicoRepository) {}

  async ejecutar(id: string, consultorioId: string): Promise<ServicioMedicoEntity> {
    return this.repo.obtener(id, consultorioId)
  }
}
