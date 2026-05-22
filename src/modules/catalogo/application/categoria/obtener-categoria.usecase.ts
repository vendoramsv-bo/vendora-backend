import type { ICategoriaRepository } from "../../domain/ports/ICategoriaRepository.js"
import type { CategoriaEntity } from "../../domain/categoria.entity.js"
import { CategoriaNoEncontrada } from "../../domain/catalogo.errors.js"

export class ObtenerCategoriaUseCase {
  constructor(private readonly repo: ICategoriaRepository) {}

  async ejecutar(id: string, tenantId: string): Promise<CategoriaEntity> {
    const categoria = await this.repo.obtener(id, tenantId)
    if (!categoria) throw new CategoriaNoEncontrada(id)
    return categoria
  }
}
