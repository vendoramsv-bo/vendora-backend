import type { ITurnoAtencionRepository, TurnoAtencionData } from "../../domain/ports/ITurnoAtencionRepository.js"
import { TurnoNoEncontradoError } from "../../domain/ventas.errors.js"

export interface CambiarEstadoTurnoInput {
  id: string
  tenantId: string
  estado: "ACTIVO" | "INACTIVO"
  updatedById?: string | null
}

export class CambiarEstadoTurnoAtencionUseCase {
  constructor(private readonly repo: ITurnoAtencionRepository) {}

  async execute(input: CambiarEstadoTurnoInput): Promise<TurnoAtencionData> {
    const existing = await this.repo.obtener(input.id, input.tenantId)
    if (!existing) throw new TurnoNoEncontradoError(input.id)

    return this.repo.cambiarEstado(input.id, input.tenantId, input.estado, input.updatedById)
  }
}
