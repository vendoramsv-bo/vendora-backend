import type { ICategoriaRepository } from "../../domain/ports/ICategoriaRepository.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { CategoriaNoEncontrada } from "../../domain/catalogo.errors.js"

export class CambiarEstadoCategoriaUseCase {
  constructor(
    private readonly repo: ICategoriaRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(id: string, estado: string, tenantId: string, userId: string): Promise<void> {
    const categoria = await this.repo.obtener(id, tenantId)
    if (!categoria) throw new CategoriaNoEncontrada(id)

    if (estado === "INACTIVO") {
      await this.repo.desactivarConCascada(id, userId)
    } else {
      await this.repo.actualizar(id, {}, userId)
      await this.repo.obtener(id, tenantId)
    }

    this.notificador.categoriaActualizada(tenantId, {
      tenantId,
      categoriaId: id,
      nombre: categoria.nombre,
      estado,
    })
  }
}
