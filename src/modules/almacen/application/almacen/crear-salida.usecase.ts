import type { ISalidaAlmacenRepository } from "../../domain/ports/ISalidaAlmacenRepository.js"
import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import {
  InsumoNoEncontradoError,
  DetalleVacioError,
} from "../../domain/almacen.errors.js"

export interface SalidaDetalleInput {
  insumoId: string
  cantidad: number
}

export interface CrearSalidaInput {
  tenantId: string
  motivo?: string
  descripcion?: string
  detalles: SalidaDetalleInput[]
  createdById?: string
  tenantMemberId?: string
}

export class CrearSalidaUseCase {
  constructor(
    private readonly salidaRepo: ISalidaAlmacenRepository,
    private readonly insumoRepo: IInsumoRepository
  ) {}

  async execute(input: CrearSalidaInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()

    for (const d of input.detalles) {
      const ins = await this.insumoRepo.findById(d.insumoId, input.tenantId)
      if (!ins) throw new InsumoNoEncontradoError(d.insumoId)
    }

    return this.salidaRepo.create({
      tenantId: input.tenantId,
      motivo: input.motivo,
      descripcion: input.descripcion,
      detalles: input.detalles,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })
  }
}
