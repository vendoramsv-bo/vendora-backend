import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { IRecetaProductoRepository } from "../../domain/ports/IRecetaProductoRepository.js"
import { InsumoNoEncontradoError, InsumoEnUsoEnRecetaError, InsumoEnUsoError } from "../../domain/almacen.errors.js"

export class EliminarInsumoUseCase {
  constructor(
    private readonly repo: IInsumoRepository,
    private readonly recetaRepo: IRecetaProductoRepository
  ) {}

  async execute(id: string, tenantId: string) {
    const insumo = await this.repo.findById(id, tenantId)
    if (!insumo) throw new InsumoNoEncontradoError(id)

    const productosAfectados = await this.recetaRepo.findReferencingProducts(id, tenantId)
    if (productosAfectados.length > 0) throw new InsumoEnUsoEnRecetaError(productosAfectados)

    // Con historial o en documentos no se borra: la cascada se llevaría todo (spec 033, B-01).
    if (await this.repo.enUso(id, tenantId)) throw new InsumoEnUsoError(id)

    await this.repo.delete(id, tenantId)
  }
}
