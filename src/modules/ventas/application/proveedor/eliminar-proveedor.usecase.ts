import type { IProveedorRepository } from "../../domain/ports/IProveedorRepository.js"
import { ProveedorNoEncontradoError, ProveedorEnUsoError } from "../../domain/ventas.errors.js"

export class EliminarProveedorUseCase {
  constructor(private readonly repo: IProveedorRepository) {}

  async execute(id: string, tenantId: string) {
    const existente = await this.repo.obtenerPorId(id, tenantId)
    if (!existente) throw new ProveedorNoEncontradoError(id)

    const enUso = await this.repo.tieneCompras(id, tenantId)
    if (enUso) throw new ProveedorEnUsoError()

    return this.repo.eliminar(id, tenantId)
  }
}
