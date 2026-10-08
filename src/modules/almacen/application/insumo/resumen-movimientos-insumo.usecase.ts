import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import { InsumoNoEncontradoError } from "../../domain/almacen.errors.js"

/**
 * Cuánto entró y salió de un insumo en todo su historial, y su stock actual
 * (spec 033, B-04). Lo usa el resumen de Movimientos del almacén: sumar sobre la página
 * visible daría totales falsos en cuanto el historial tenga más de una página.
 */
export class ResumenMovimientosInsumoUseCase {
  constructor(private readonly repo: IInsumoRepository) {}

  async execute(insumoId: string, tenantId: string) {
    const resumen = await this.repo.resumenMovimientos(insumoId, tenantId)
    if (!resumen) throw new InsumoNoEncontradoError(insumoId)
    return resumen
  }
}
