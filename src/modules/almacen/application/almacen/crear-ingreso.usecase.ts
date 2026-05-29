import type { IIngresoAlmacenRepository } from "../../domain/ports/IIngresoAlmacenRepository.js"
import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import {
  ProveedorNoEncontradoError,
  InsumoNoEncontradoError,
  DetalleVacioError,
} from "../../domain/almacen.errors.js"

export interface IngresoDetalleInput {
  insumoId: string
  cantidad: number
  costoUnitario?: number
  lote?: string
  fechaVencimiento?: Date
  observaciones?: string
}

export interface CrearIngresoInput {
  tenantId: string
  proveedorId: string
  descripcion?: string
  detalles: IngresoDetalleInput[]
  createdById?: string
  tenantMemberId?: string
}

export class CrearIngresoUseCase {
  constructor(
    private readonly ingresoRepo: IIngresoAlmacenRepository,
    private readonly insumoRepo: IInsumoRepository,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly db: any
  ) {}

  async execute(input: CrearIngresoInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()

    const proveedor = await this.db.proveedor.findFirst({
      where: { id: input.proveedorId, tenantId: input.tenantId },
    })
    if (!proveedor) throw new ProveedorNoEncontradoError(input.proveedorId)

    for (const d of input.detalles) {
      const ins = await this.insumoRepo.findById(d.insumoId, input.tenantId)
      if (!ins) throw new InsumoNoEncontradoError(d.insumoId)
    }

    return this.ingresoRepo.create({
      tenantId: input.tenantId,
      proveedorId: input.proveedorId,
      descripcion: input.descripcion,
      detalles: input.detalles,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })
  }
}
