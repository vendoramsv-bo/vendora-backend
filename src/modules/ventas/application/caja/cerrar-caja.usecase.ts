import type { ICajaRepository, CajaAbiertaData } from "../../domain/ports/ICajaRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { CajaNoEncontradaError, CajaYaCerradaError } from "../../domain/ventas.errors.js"

export interface CerrarCajaInput {
  id: string
  tenantId: string
  montoArqueoCaja: number
  updatedById?: string | null
}

export class CerrarCajaUseCase {
  constructor(
    private readonly cajaRepo: ICajaRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: CerrarCajaInput): Promise<CajaAbiertaData> {
    const caja = await this.cajaRepo.obtener(input.id, input.tenantId)
    if (!caja) throw new CajaNoEncontradaError(input.id)
    if (caja.estadoCaja !== "APERTURADA") throw new CajaYaCerradaError()

    const cajaCerrada = await this.cajaRepo.cerrar(input.id, input.tenantId, input.montoArqueoCaja, input.updatedById)

    this.notificador.cajaCerrada(input.tenantId, {
      cajaId: cajaCerrada.id,
      tenantId: input.tenantId,
      montoArqueoCaja: cajaCerrada.montoArqueoCaja,
    })

    return cajaCerrada
  }
}
