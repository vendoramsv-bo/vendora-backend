import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import { InsumoNoEncontradoError } from "../../domain/almacen.errors.js"

export class ObtenerInsumoUseCase {
  constructor(private readonly repo: IInsumoRepository) {}

  async execute(id: string, tenantId: string) {
    const insumo = await this.repo.findById(id, tenantId)
    if (!insumo) throw new InsumoNoEncontradoError(id)
    const now = new Date()
    return {
      ...insumo,
      estadoCritico: insumo.cantidadStock < insumo.stockMinimo,
      vencido: insumo.fechaVencimiento != null && insumo.fechaVencimiento < now,
    }
  }
}
