import type { IUnidadMedidaRepository } from "../../domain/ports/IUnidadMedidaRepository.js"
import type { UnidadMedidaEntity } from "../../domain/unidad-medida.entity.js"

export class ListarUnidadesUseCase {
  constructor(private readonly repo: IUnidadMedidaRepository) {}

  async ejecutar(tenantId: string): Promise<{ unidades: UnidadMedidaEntity[]; clasificadores: Array<{ id: string; nombre: string; sigla: string }> }> {
    const [unidades, clasificadores] = await Promise.all([
      this.repo.listar(tenantId),
      this.repo.listarClasificadores(),
    ])
    return { unidades, clasificadores }
  }
}
