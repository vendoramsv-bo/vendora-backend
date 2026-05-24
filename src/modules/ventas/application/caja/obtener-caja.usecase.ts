import type { ICajaRepository, CajaAbiertaData } from "../../domain/ports/ICajaRepository.js"
import { CajaNoEncontradaError } from "../../domain/ventas.errors.js"

export class ObtenerCajaUseCase {
  constructor(private readonly cajaRepo: ICajaRepository) {}

  async execute(id: string, tenantId: string): Promise<CajaAbiertaData> {
    const caja = await this.cajaRepo.obtener(id, tenantId)
    if (!caja) throw new CajaNoEncontradaError(id)
    return caja
  }
}
