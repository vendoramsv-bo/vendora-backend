import type { ISalidaAlmacenRepository, ActualizarSalidaDTO } from "../../domain/ports/ISalidaAlmacenRepository.js"

export class ActualizarSalidaUseCase {
  constructor(private readonly repo: ISalidaAlmacenRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarSalidaDTO) {
    return this.repo.actualizarSalida(id, tenantId, dto)
  }
}
