import type { ICompraRepository } from "../../domain/ports/ICompraRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { CompraNoEncontradaError, CompraYaConfirmadaError } from "../../domain/ventas.errors.js"

export interface ActualizarCompraInput {
  id: string
  tenantId: string
  proveedorId?: string
  fecha?: Date
  descripcion?: string | null
  updatedById?: string | null
}

export class ActualizarCompraUseCase {
  constructor(
    private readonly repo: ICompraRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: ActualizarCompraInput) {
    const existente = await this.repo.obtenerPorId(input.id, input.tenantId)
    if (!existente) throw new CompraNoEncontradaError(input.id)
    if (existente.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()

    const compra = await this.repo.actualizar(input.id, input.tenantId, {
      proveedorId: input.proveedorId,
      fecha: input.fecha,
      descripcion: input.descripcion,
      updatedById: input.updatedById,
    })

    this.notificador.compraActualizada(input.tenantId, {
      compraId: compra.id,
      proveedorId: compra.proveedorId,
      estado: compra.estado,
      tenantId: input.tenantId,
    })

    return compra
  }
}
