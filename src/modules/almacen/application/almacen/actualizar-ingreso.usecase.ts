import type { IIngresoAlmacenRepository, ActualizarIngresoDTO } from "../../domain/ports/IIngresoAlmacenRepository.js"
import { validarFechaDocumento } from "../../domain/almacen.errors.js"

export class ActualizarIngresoUseCase {
  constructor(private readonly repo: IIngresoAlmacenRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarIngresoDTO) {
    validarFechaDocumento(dto.fecha)
    return this.repo.actualizarIngreso(id, tenantId, dto)
  }
}
