import type { IUnidadMedidaRepository, UnidadUpdateDTO } from "../../domain/ports/IUnidadMedidaRepository.js"
import type { UnidadMedidaEntity } from "../../domain/unidad-medida.entity.js"
import { UnidadNoEncontrada } from "../../domain/catalogo.errors.js"

export class ActualizarUnidadUseCase {
  constructor(private readonly repo: IUnidadMedidaRepository) {}

  async ejecutar(id: string, data: UnidadUpdateDTO, tenantId: string, userId: string): Promise<UnidadMedidaEntity> {
    const existente = await this.repo.obtener(id, tenantId)
    if (!existente) throw new UnidadNoEncontrada(id)
    return this.repo.actualizar(id, data, userId)
  }
}
