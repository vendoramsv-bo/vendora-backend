import type { IProductoRepository, ListResult } from "../../domain/ports/IProductoRepository.js"
import type { ProductoEntity } from "../../domain/producto.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarProductosUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(tenantId: string, params: QueryParams): Promise<ListResult<ProductoEntity>> {
    return this.repo.listar(tenantId, params)
  }
}
