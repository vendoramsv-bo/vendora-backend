import type { ISalidaAlmacenRepository } from "../../domain/ports/ISalidaAlmacenRepository.js"

/**
 * Eliminar una salida **pendiente** (spec 033, B-02).
 *
 * Un pendiente nunca tocó el stock, así que no hay movimientos que revertir: se borra con
 * sus líneas. Una salida aprobada no se elimina (`DocumentoYaAprobadoError`).
 */
export class EliminarSalidaUseCase {
  constructor(private readonly repo: ISalidaAlmacenRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    await this.repo.eliminarSalida(id, tenantId)
  }
}
