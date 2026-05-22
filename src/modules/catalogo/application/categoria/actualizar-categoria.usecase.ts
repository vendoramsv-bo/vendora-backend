import type { ICategoriaRepository, CategoriaUpdateDTO } from "../../domain/ports/ICategoriaRepository.js"
import type { CategoriaEntity } from "../../domain/categoria.entity.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { CategoriaNoEncontrada } from "../../domain/catalogo.errors.js"

export class ActualizarCategoriaUseCase {
  constructor(
    private readonly repo: ICategoriaRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(id: string, data: CategoriaUpdateDTO, tenantId: string, userId: string): Promise<CategoriaEntity> {
    const existente = await this.repo.obtener(id, tenantId)
    if (!existente) throw new CategoriaNoEncontrada(id)

    const categoria = await this.repo.actualizar(id, data, userId)

    this.notificador.categoriaActualizada(tenantId, {
      tenantId,
      categoriaId: categoria.id,
      nombre: categoria.nombre,
      estado: categoria.estado,
    })

    return categoria
  }
}
