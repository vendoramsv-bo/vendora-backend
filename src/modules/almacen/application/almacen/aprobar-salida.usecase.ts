import type { ISalidaAlmacenRepository } from "../../domain/ports/ISalidaAlmacenRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface AprobarSalidaInput {
  salidaId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
}

export class AprobarSalidaUseCase {
  constructor(
    private readonly repo: ISalidaAlmacenRepository,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: AprobarSalidaInput) {
    const resultado = await this.repo.aprobarSalida({
      salidaId: input.salidaId,
      tenantId: input.tenantId,
      version: input.version,
      aprobadoPorId: input.aprobadoPorId,
    })

    for (const d of resultado.detalles) {
      const evento = evaluarStockCritico(d.stockAntes, d.stockDespues, d.stockMinimo)
      if (evento === "critico") {
        this.notificador.insumoStockCritico(input.tenantId, {
          insumoId: d.insumoId,
          insumoNombre: d.insumoNombre,
          stockActual: d.stockDespues,
          stockMinimo: d.stockMinimo,
          tenantId: input.tenantId,
        })
      }
    }

    return resultado
  }
}
