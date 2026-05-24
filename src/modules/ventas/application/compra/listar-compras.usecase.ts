import type { ICompraRepository } from "../../domain/ports/ICompraRepository.js"
import { makeQueryParamsSchema, paginate } from "../../../../core/query-params.js"

export const QueryParamsCompraSchema = makeQueryParamsSchema(["fecha", "createdAt"])
export type QueryParamsCompra = ReturnType<typeof QueryParamsCompraSchema.parse>

export class ListarComprasUseCase {
  constructor(private readonly repo: ICompraRepository) {}

  async execute(tenantId: string, params: QueryParamsCompra, estado?: string, proveedorId?: string) {
    const { data, total } = await this.repo.listar(tenantId, params, estado, proveedorId)
    return paginate(data, total, params)
  }
}
