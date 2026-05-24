import type { IClienteRepository } from "../../domain/ports/IClienteRepository.js"
import { makeQueryParamsSchema, paginate } from "../../../../core/query-params.js"

export const QueryParamsClienteSchema = makeQueryParamsSchema(["nombre", "createdAt"])
export type QueryParamsCliente = ReturnType<typeof QueryParamsClienteSchema.parse>

export class ListarClientesUseCase {
  constructor(private readonly repo: IClienteRepository) {}

  async execute(tenantId: string, params: QueryParamsCliente, estado?: string) {
    const { data, total } = await this.repo.listar(tenantId, params, estado)
    return paginate(data, total, params)
  }
}
