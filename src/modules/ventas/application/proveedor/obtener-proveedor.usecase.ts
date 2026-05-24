import type { IProveedorRepository } from "../../domain/ports/IProveedorRepository.js"
import { ProveedorNoEncontradoError } from "../../domain/ventas.errors.js"

export class ObtenerProveedorUseCase {
  constructor(private readonly repo: IProveedorRepository) {}

  async execute(id: string, tenantId: string) {
    const proveedor = await this.repo.obtenerPorId(id, tenantId)
    if (!proveedor) throw new ProveedorNoEncontradoError(id)
    return proveedor
  }
}
