import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import { DetalleVacioError } from "../../domain/almacen.errors.js"

export interface CrearAjusteInput {
  tenantId: string
  motivo?: string
  detalles: Array<{ productoId: string; varianteId?: string; cantidadAjuste: number }>
  createdById?: string
  tenantMemberId?: string
}

export class CrearAjusteUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(input: CrearAjusteInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()
    return this.repo.crearAjuste({
      tenantId: input.tenantId,
      motivo: input.motivo,
      detalles: input.detalles,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })
  }
}
