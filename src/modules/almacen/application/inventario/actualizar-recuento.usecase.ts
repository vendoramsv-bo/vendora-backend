import type { IInventarioProductoRepository, ActualizarRecuentoDTO } from "../../domain/ports/IInventarioProductoRepository.js"

export class ActualizarRecuentoUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarRecuentoDTO) {
    return this.repo.actualizarRecuento(id, tenantId, dto)
  }
}
