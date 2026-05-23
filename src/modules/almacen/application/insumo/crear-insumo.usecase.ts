import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import { InsumoNombreDuplicadoError } from "../../domain/almacen.errors.js"

export interface CrearInsumoInput {
  tenantId: string
  nombre: string
  unidadMedidaId: string
  stockMinimo?: number
  costoUnitario?: number
  fechaVencimiento?: Date
  createdById?: string
}

export class CrearInsumoUseCase {
  constructor(private readonly repo: IInsumoRepository) {}

  async execute(input: CrearInsumoInput) {
    const existente = await this.repo.findByNombre(input.nombre, input.tenantId)
    if (existente) throw new InsumoNombreDuplicadoError(input.nombre)

    return this.repo.create({
      tenantId: input.tenantId,
      nombre: input.nombre,
      unidadMedidaId: input.unidadMedidaId,
      stockMinimo: input.stockMinimo,
      costoUnitario: input.costoUnitario,
      fechaVencimiento: input.fechaVencimiento,
      createdById: input.createdById,
    })
  }
}
