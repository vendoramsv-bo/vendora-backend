import type { ICategoriaRepository } from "../../domain/ports/ICategoriaRepository.js"
import type { CategoriaEntity } from "../../domain/categoria.entity.js"

export class ListarCategoriasUseCase {
  constructor(private readonly repo: ICategoriaRepository) {}

  async ejecutar(tenantId: string, actividadId?: string, estado?: string): Promise<CategoriaEntity[]> {
    return this.repo.listar(tenantId, actividadId, estado)
  }
}
