import type { ICajaRepository, IngresoCajaData } from "../../domain/ports/ICajaRepository.js"
import { CajaNoEncontradaError, CajaYaCerradaError } from "../../domain/ventas.errors.js"

export interface RegistrarIngresoCajaInput {
  cajaId: string
  tenantId: string
  motivo: string
  montoIngreso: number
}

export class RegistrarIngresoCajaUseCase {
  constructor(private readonly cajaRepo: ICajaRepository) {}

  async execute(input: RegistrarIngresoCajaInput): Promise<IngresoCajaData> {
    const caja = await this.cajaRepo.obtener(input.cajaId, input.tenantId)
    if (!caja) throw new CajaNoEncontradaError(input.cajaId)
    if (caja.estadoCaja !== "APERTURADA") throw new CajaYaCerradaError()

    return this.cajaRepo.registrarIngreso(input.cajaId, input.tenantId, input.motivo, input.montoIngreso)
  }
}
