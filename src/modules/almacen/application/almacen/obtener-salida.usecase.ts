import type { ISalidaAlmacenRepository } from "../../domain/ports/ISalidaAlmacenRepository.js"
import { DocumentoNoEncontradoError } from "../../domain/almacen.errors.js"

export class ObtenerSalidaUseCase {
  constructor(private readonly repo: ISalidaAlmacenRepository) {}

  async execute(id: string, tenantId: string) {
    const salida = await this.repo.obtenerSalida(id, tenantId)
    if (!salida) throw new DocumentoNoEncontradoError("SALIDA", id)
    return salida
  }
}
