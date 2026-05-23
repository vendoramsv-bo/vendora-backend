import type { IRecetaProductoRepository } from "../../domain/ports/IRecetaProductoRepository.js"
import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import { InsumoNoEncontradoError } from "../../domain/almacen.errors.js"

export interface DefinirRecetaInput {
  productoId: string
  varianteId?: string | null
  tenantId: string
  lineas: Array<{ insumoId: string; cantidad: number }>
}

export class DefinirRecetaUseCase {
  constructor(
    private readonly recetaRepo: IRecetaProductoRepository,
    private readonly insumoRepo: IInsumoRepository
  ) {}

  async execute(input: DefinirRecetaInput) {
    for (const linea of input.lineas) {
      const insumo = await this.insumoRepo.findById(linea.insumoId, input.tenantId)
      if (!insumo) throw new InsumoNoEncontradoError(linea.insumoId)
    }

    return this.recetaRepo.upsert({
      productoId: input.productoId,
      varianteId: input.varianteId ?? null,
      lineas: input.lineas,
    })
  }
}
