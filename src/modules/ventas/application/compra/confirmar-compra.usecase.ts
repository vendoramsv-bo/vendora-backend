import type { ICompraRepository, ConfirmarResultado } from "../../domain/ports/ICompraRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"

export interface ConfirmarCompraInput {
  id: string
  tenantId: string
  updatedById?: string | null
}

export class ConfirmarCompraUseCase {
  constructor(
    private readonly repo: ICompraRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: ConfirmarCompraInput): Promise<ConfirmarResultado> {
    const resultado = await this.repo.confirmar(input.id, input.tenantId, input.updatedById)

    this.notificador.compraConfirmada(input.tenantId, {
      compraId: resultado.compra.id,
      proveedorId: resultado.compra.proveedorId,
      tenantId: input.tenantId,
    })

    return resultado
  }
}
