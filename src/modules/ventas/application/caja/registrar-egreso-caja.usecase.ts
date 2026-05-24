import type { ICajaRepository, EgresoCajaData } from "../../domain/ports/ICajaRepository.js"
import { CajaNoEncontradaError, CajaYaCerradaError } from "../../domain/ventas.errors.js"

export interface RegistrarEgresoCajaInput {
  cajaId: string
  tenantId: string
  motivo: string
  montoEgreso: number
}

export class RegistrarEgresoCajaUseCase {
  constructor(private readonly cajaRepo: ICajaRepository) {}

  async execute(input: RegistrarEgresoCajaInput): Promise<EgresoCajaData> {
    const caja = await this.cajaRepo.obtener(input.cajaId, input.tenantId)
    if (!caja) throw new CajaNoEncontradaError(input.cajaId)
    if (caja.estadoCaja !== "APERTURADA") throw new CajaYaCerradaError()

    return this.cajaRepo.registrarEgreso(input.cajaId, input.tenantId, input.motivo, input.montoEgreso)
  }
}
