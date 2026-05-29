import type { IIngresoAlmacenRepository } from "../../domain/ports/IIngresoAlmacenRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface AprobarIngresoInput {
  ingresoId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
}

export class AprobarIngresoUseCase {
  constructor(
    private readonly repo: IIngresoAlmacenRepository,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: AprobarIngresoInput) {
    const resultado = await this.repo.aprobarIngreso({
      ingresoId: input.ingresoId,
      tenantId: input.tenantId,
      version: input.version,
      aprobadoPorId: input.aprobadoPorId,
    })

    for (const d of resultado.detalles) {
      const evento = evaluarStockCritico(d.stockAntes, d.stockDespues, d.stockMinimo)
      if (evento === "normalizado") {
        this.notificador.insumoStockNormalizado(input.tenantId, {
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
