import type { IGastosRepository } from "../../domain/ports/IGastosRepository.js"
import { GastoNoEncontradoError } from "../../domain/ventas.errors.js"

export class EliminarGastoUseCase {
  constructor(private readonly repo: IGastosRepository) {}

  async execute(id: string, tenantId: string, updatedById?: string | null): Promise<void> {
    const gasto = await this.repo.obtener(id, tenantId)
    if (!gasto || gasto.estado === "ELIMINADO") throw new GastoNoEncontradoError(id)

    return this.repo.eliminar(id, tenantId, updatedById)
  }
}
