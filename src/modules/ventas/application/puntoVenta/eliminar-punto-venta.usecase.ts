import type { IPuntoVentaRepository } from "../../domain/ports/IPuntoVentaRepository.js"
import { PuntoVentaNoEncontradoError } from "../../domain/ventas.errors.js"

export interface EliminarPuntoVentaInput {
  id: string
  tenantId: string
  updatedById?: string | null
}

export interface EliminarPuntoVentaResult {
  eliminado: boolean
}

export class EliminarPuntoVentaUseCase {
  constructor(private readonly repo: IPuntoVentaRepository) {}

  async execute(input: EliminarPuntoVentaInput): Promise<EliminarPuntoVentaResult> {
    const existing = await this.repo.obtener(input.id, input.tenantId)
    if (!existing) throw new PuntoVentaNoEncontradoError(input.id)

    const tieneMovimientos = await this.repo.tieneMovimientos(input.id, input.tenantId)
    if (tieneMovimientos) {
      // Tiene ventas o aperturas/cierres de caja asociados — desactivar en
      // vez de eliminar (eliminar en cascada borraría ese historial).
      await this.repo.cambiarEstado(input.id, input.tenantId, "INACTIVO", input.updatedById)
      return { eliminado: false }
    }

    await this.repo.eliminar(input.id, input.tenantId)
    return { eliminado: true }
  }
}
