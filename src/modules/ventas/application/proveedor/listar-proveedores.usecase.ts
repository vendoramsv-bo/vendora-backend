import type { IProveedorRepository } from "../../domain/ports/IProveedorRepository.js"
import { makeQueryParamsSchema, paginate } from "../../../../core/query-params.js"

export const QueryParamsProveedorSchema = makeQueryParamsSchema(["nombre", "createdAt"])
export type QueryParamsProveedor = ReturnType<typeof QueryParamsProveedorSchema.parse>

export class ListarProveedoresUseCase {
  constructor(private readonly repo: IProveedorRepository) {}

  async execute(tenantId: string, params: QueryParamsProveedor, estado?: string) {
    const { data, total } = await this.repo.listar(tenantId, params, estado)
    return paginate(data, total, params)
  }
}
