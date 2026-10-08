import type { ISalidaAlmacenRepository, ActualizarSalidaDTO } from "../../domain/ports/ISalidaAlmacenRepository.js"
import { validarFechaDocumento } from "../../domain/almacen.errors.js"

export class ActualizarSalidaUseCase {
  constructor(private readonly repo: ISalidaAlmacenRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarSalidaDTO) {
    validarFechaDocumento(dto.fecha)
    return this.repo.actualizarSalida(id, tenantId, dto)
  }
}
