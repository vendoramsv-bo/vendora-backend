import type { IGastosRepository, GastoData } from "../../domain/ports/IGastosRepository.js"
import { GastoNoEncontradoError } from "../../domain/ventas.errors.js"

export interface ActualizarGastoInput {
  id: string
  tenantId: string
  fecha?: Date
  motivo?: string
  totalGasto?: number
  updatedById?: string | null
}

export class ActualizarGastoUseCase {
  constructor(private readonly repo: IGastosRepository) {}

  async execute(input: ActualizarGastoInput): Promise<GastoData> {
    const gasto = await this.repo.obtener(input.id, input.tenantId)
    if (!gasto) throw new GastoNoEncontradoError(input.id)
    if (gasto.estado === "ELIMINADO") throw new GastoNoEncontradoError(input.id)

    return this.repo.actualizar(input.id, input.tenantId, {
      fecha: input.fecha,
      motivo: input.motivo,
      totalGasto: input.totalGasto,
      updatedById: input.updatedById ?? null,
    })
  }
}
