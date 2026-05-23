import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import { InsumoNoEncontradoError, InsumoNombreDuplicadoError } from "../../domain/almacen.errors.js"

export interface ActualizarInsumoInput {
  id: string
  tenantId: string
  nombre?: string
  unidadMedidaId?: string
  stockMinimo?: number
  costoUnitario?: number
  fechaVencimiento?: Date | null
  updatedById?: string
}

export class ActualizarInsumoUseCase {
  constructor(private readonly repo: IInsumoRepository) {}

  async execute(input: ActualizarInsumoInput) {
    const actual = await this.repo.findById(input.id, input.tenantId)
    if (!actual) throw new InsumoNoEncontradoError(input.id)

    if (input.nombre && input.nombre !== actual.nombre) {
      const duplicado = await this.repo.findByNombre(input.nombre, input.tenantId)
      if (duplicado) throw new InsumoNombreDuplicadoError(input.nombre)
    }

    return this.repo.update(input.id, input.tenantId, {
      nombre: input.nombre,
      unidadMedidaId: input.unidadMedidaId,
      stockMinimo: input.stockMinimo,
      costoUnitario: input.costoUnitario,
      fechaVencimiento: input.fechaVencimiento,
      updatedById: input.updatedById,
    })
  }
}
