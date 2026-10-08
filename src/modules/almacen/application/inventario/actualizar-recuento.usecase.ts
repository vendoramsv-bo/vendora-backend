import type { IInventarioProductoRepository, ActualizarRecuentoDTO } from "../../domain/ports/IInventarioProductoRepository.js"
import { validarFechaDocumento } from "../../domain/almacen.errors.js"

export class ActualizarRecuentoUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarRecuentoDTO) {
    validarFechaDocumento(dto.fecha)
    return this.repo.actualizarRecuento(id, tenantId, dto)
  }
}
