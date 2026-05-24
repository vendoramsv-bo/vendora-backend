import type { IClienteRepository } from "../../domain/ports/IClienteRepository.js"
import { ClienteNoEncontradoError } from "../../domain/ventas.errors.js"

export class ObtenerClienteUseCase {
  constructor(private readonly repo: IClienteRepository) {}

  async execute(id: string, tenantId: string) {
    const cliente = await this.repo.obtenerPorId(id, tenantId)
    if (!cliente) throw new ClienteNoEncontradoError(id)
    return cliente
  }
}
