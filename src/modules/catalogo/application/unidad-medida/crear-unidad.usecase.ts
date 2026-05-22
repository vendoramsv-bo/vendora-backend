import type { IUnidadMedidaRepository, UnidadCreateDTO } from "../../domain/ports/IUnidadMedidaRepository.js"
import type { UnidadMedidaEntity } from "../../domain/unidad-medida.entity.js"
import { UnidadDuplicada } from "../../domain/catalogo.errors.js"

export class CrearUnidadUseCase {
  constructor(private readonly repo: IUnidadMedidaRepository) {}

  async ejecutar(data: UnidadCreateDTO, tenantId: string, userId: string): Promise<UnidadMedidaEntity> {
    const existentes = await this.repo.listar(tenantId)
    const yaExiste = existentes.some((u) => u.unidad.toLowerCase() === data.unidad.toLowerCase())
    if (yaExiste) throw new UnidadDuplicada()
    return this.repo.crear(data, tenantId, userId)
  }
}
