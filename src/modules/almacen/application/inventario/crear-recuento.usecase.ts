import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import { DetalleVacioError, validarFechaDocumento } from "../../domain/almacen.errors.js"

export interface CrearRecuentoInput {
  tenantId: string
  observacion?: string
  fecha?: Date
  detalles: Array<{ productoId: string; varianteId?: string; stockFisico: number }>
  createdById?: string
  tenantMemberId?: string
}

export class CrearRecuentoUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(input: CrearRecuentoInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()
    validarFechaDocumento(input.fecha)
    return this.repo.crearRecuento({
      tenantId: input.tenantId,
      observacion: input.observacion,
      fecha: input.fecha,
      detalles: input.detalles,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })
  }
}
