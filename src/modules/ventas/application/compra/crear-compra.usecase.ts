import type { ICompraRepository, CompraDetalleInput, CompraCostoInput } from "../../domain/ports/ICompraRepository.js"
import type { IProveedorRepository } from "../../domain/ports/IProveedorRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { DetalleVacioError, ProveedorNoEncontradoError } from "../../domain/ventas.errors.js"

export interface CrearCompraInput {
  tenantId: string
  proveedorId: string
  fecha?: Date
  descripcion?: string | null
  detalles: CompraDetalleInput[]
  costosAdicionales?: CompraCostoInput[]
  createdById?: string | null
}

export class CrearCompraUseCase {
  constructor(
    private readonly repo: ICompraRepository,
    private readonly proveedorRepo: IProveedorRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: CrearCompraInput) {
    if (!input.detalles || input.detalles.length === 0) throw new DetalleVacioError()

    const proveedor = await this.proveedorRepo.obtenerPorId(input.proveedorId, input.tenantId)
    if (!proveedor) throw new ProveedorNoEncontradoError(input.proveedorId)

    const compra = await this.repo.crear({
      tenantId: input.tenantId,
      proveedorId: input.proveedorId,
      fecha: input.fecha,
      descripcion: input.descripcion ?? null,
      detalles: input.detalles,
      costosAdicionales: input.costosAdicionales ?? [],
      createdById: input.createdById ?? null,
    })

    this.notificador.compraCreada(input.tenantId, {
      compraId: compra.id,
      proveedorId: compra.proveedorId,
      estado: compra.estado,
      tenantId: input.tenantId,
    })

    return compra
  }
}
