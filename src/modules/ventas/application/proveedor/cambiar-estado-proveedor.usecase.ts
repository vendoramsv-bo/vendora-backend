import type { IProveedorRepository } from "../../domain/ports/IProveedorRepository.js"
import { ProveedorNoEncontradoError } from "../../domain/ventas.errors.js"

export class CambiarEstadoProveedorUseCase {
  constructor(private readonly repo: IProveedorRepository) {}

  async execute(id: string, tenantId: string, estado: "ACTIVO" | "INACTIVO", updatedById?: string | null) {
    const existente = await this.repo.obtenerPorId(id, tenantId)
    if (!existente) throw new ProveedorNoEncontradoError(id)
    return this.repo.cambiarEstado(id, tenantId, estado, updatedById)
  }
}
