import type { IClienteRepository } from "../../domain/ports/IClienteRepository.js"
import { ClienteNoEncontradoError } from "../../domain/ventas.errors.js"

export class CambiarEstadoClienteUseCase {
  constructor(private readonly repo: IClienteRepository) {}

  async execute(id: string, tenantId: string, estado: "ACTIVO" | "INACTIVO", updatedById?: string | null) {
    const existente = await this.repo.obtenerPorId(id, tenantId)
    if (!existente) throw new ClienteNoEncontradoError(id)
    return this.repo.cambiarEstado(id, tenantId, estado, updatedById)
  }
}
