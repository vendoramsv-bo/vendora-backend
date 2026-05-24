import type { IPuntoVentaRepository, PuntoVentaData } from "../../domain/ports/IPuntoVentaRepository.js"
import { PuntoVentaNoEncontradoError } from "../../domain/ventas.errors.js"

export interface CambiarEstadoPuntoVentaInput {
  id: string
  tenantId: string
  estado: "ACTIVO" | "INACTIVO"
  updatedById?: string | null
}

export class CambiarEstadoPuntoVentaUseCase {
  constructor(private readonly repo: IPuntoVentaRepository) {}

  async execute(input: CambiarEstadoPuntoVentaInput): Promise<PuntoVentaData> {
    const existing = await this.repo.obtener(input.id, input.tenantId)
    if (!existing) throw new PuntoVentaNoEncontradoError(input.id)

    return this.repo.cambiarEstado(input.id, input.tenantId, input.estado, input.updatedById)
  }
}
