import type { IInventarioProductoRepository, ActualizarAjusteDTO } from "../../domain/ports/IInventarioProductoRepository.js"

export class ActualizarAjusteUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarAjusteDTO) {
    return this.repo.actualizarAjuste(id, tenantId, dto)
  }
}
