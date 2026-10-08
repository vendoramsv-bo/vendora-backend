import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"

/**
 * Eliminar un ajuste **pendiente** (spec 032, B-01).
 *
 * Un pendiente nunca tocó el stock, así que no hay movimientos que revertir: se borra con
 * sus líneas. Uno aprobado no se elimina (`DocumentoYaAprobadoError`): su efecto se
 * corrige con otro ajuste.
 */
export class EliminarAjusteUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    await this.repo.eliminarAjuste(id, tenantId)
  }
}
