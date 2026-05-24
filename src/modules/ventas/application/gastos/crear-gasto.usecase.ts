import type { IGastosRepository, GastoData } from "../../domain/ports/IGastosRepository.js"

export interface CrearGastoInput {
  tenantId: string
  tenantMemberId?: string | null
  fecha: Date
  motivo: string
  totalGasto: number
  createdById?: string | null
}

export class CrearGastoUseCase {
  constructor(private readonly repo: IGastosRepository) {}

  async execute(input: CrearGastoInput): Promise<GastoData> {
    if (input.totalGasto <= 0) throw new Error("El totalGasto debe ser mayor a 0")

    return this.repo.crear({
      tenantId: input.tenantId,
      tenantMemberId: input.tenantMemberId ?? null,
      fecha: input.fecha,
      motivo: input.motivo,
      totalGasto: input.totalGasto,
      createdById: input.createdById ?? null,
    })
  }
}
