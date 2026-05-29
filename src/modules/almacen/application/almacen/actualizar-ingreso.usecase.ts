import type { IIngresoAlmacenRepository, ActualizarIngresoDTO } from "../../domain/ports/IIngresoAlmacenRepository.js"

export class ActualizarIngresoUseCase {
  constructor(private readonly repo: IIngresoAlmacenRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarIngresoDTO) {
    return this.repo.actualizarIngreso(id, tenantId, dto)
  }
}
