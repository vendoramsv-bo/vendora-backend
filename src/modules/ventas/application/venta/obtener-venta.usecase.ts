import type { IVentaRepository, VentaData } from "../../domain/ports/IVentaRepository.js"
import { VentaNoEncontradaError } from "../../domain/ventas.errors.js"

export class ObtenerVentaUseCase {
  constructor(private readonly repo: IVentaRepository) {}

  async execute(id: string, tenantId: string): Promise<VentaData> {
    const venta = await this.repo.obtener(id, tenantId)
    if (!venta) throw new VentaNoEncontradaError(id)
    return venta
  }
}
