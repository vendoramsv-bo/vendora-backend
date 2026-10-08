import type { IIngresoAlmacenRepository } from "../../domain/ports/IIngresoAlmacenRepository.js"

/**
 * Eliminar un ingreso **pendiente** (spec 033, B-02).
 *
 * Un pendiente nunca tocó el stock, así que no hay movimientos que revertir: se borra con
 * sus líneas. Un ingreso aprobado no se elimina (`DocumentoYaAprobadoError`).
 */
export class EliminarIngresoUseCase {
  constructor(private readonly repo: IIngresoAlmacenRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    await this.repo.eliminarIngreso(id, tenantId)
  }
}
