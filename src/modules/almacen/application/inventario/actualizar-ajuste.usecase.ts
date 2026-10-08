import type { IInventarioProductoRepository, ActualizarAjusteDTO } from "../../domain/ports/IInventarioProductoRepository.js"
import { validarFechaDocumento } from "../../domain/almacen.errors.js"

export class ActualizarAjusteUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarAjusteDTO) {
    validarFechaDocumento(dto.fecha)
    return this.repo.actualizarAjuste(id, tenantId, dto)
  }
}
