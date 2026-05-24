import type { IVentaRepository, ConfirmarVentaResultado } from "../../domain/ports/IVentaRepository.js"
import { VentaNoEncontradaError, VentaYaConfirmadaError } from "../../domain/ventas.errors.js"

export interface ConfirmarVentaInput {
  id: string
  tenantId: string
  updatedById?: string | null
}

export class ConfirmarVentaUseCase {
  constructor(private readonly repo: IVentaRepository) {}

  async execute(input: ConfirmarVentaInput): Promise<ConfirmarVentaResultado> {
    const venta = await this.repo.obtener(input.id, input.tenantId)
    if (!venta) throw new VentaNoEncontradaError(input.id)
    if (venta.estadoPago === "PAGADO") throw new VentaYaConfirmadaError()

    return this.repo.confirmar(input.id, input.tenantId, input.updatedById)
  }
}
