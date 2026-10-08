import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"

/**
 * Eliminar un recuento físico **pendiente** (spec 032, B-01). Igual que un ajuste: sin
 * movimientos que revertir; uno aprobado no se elimina.
 */
export class EliminarRecuentoUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    await this.repo.eliminarRecuento(id, tenantId)
  }
}
