import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import { DetalleVacioError } from "../../domain/almacen.errors.js"

export interface CrearRecuentoInput {
  tenantId: string
  observacion?: string
  detalles: Array<{ productoId: string; varianteId?: string; stockFisico: number }>
  createdById?: string
  tenantMemberId?: string
}

export class CrearRecuentoUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(input: CrearRecuentoInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()
    return this.repo.crearRecuento({
      tenantId: input.tenantId,
      observacion: input.observacion,
      detalles: input.detalles,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })
  }
}
