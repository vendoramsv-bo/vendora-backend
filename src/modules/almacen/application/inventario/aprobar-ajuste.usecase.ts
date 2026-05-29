import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface AprobarAjusteInput {
  ajusteId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
}

export class AprobarAjusteUseCase {
  constructor(
    private readonly repo: IInventarioProductoRepository,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: AprobarAjusteInput) {
    const resultado = await this.repo.aprobarAjuste({
      ajusteId: input.ajusteId,
      tenantId: input.tenantId,
      version: input.version,
      aprobadoPorId: input.aprobadoPorId,
    })

    for (const d of resultado.detalles) {
      const evento = evaluarStockCritico(d.stockAntes, d.stockDespues, d.stockMinimo)
      if (evento === "critico") {
        this.notificador.stockCritico(input.tenantId, {
          productoId: d.productoId,
          productoNombre: d.productoNombre,
          varianteId: d.varianteId ?? undefined,
          varianteSku: d.sku,
          stockActual: d.stockDespues,
          stockMinimo: d.stockMinimo,
          tenantId: input.tenantId,
        })
      } else if (evento === "normalizado") {
        this.notificador.stockNormalizado(input.tenantId, {
          productoId: d.productoId,
          productoNombre: d.productoNombre,
          varianteId: d.varianteId ?? undefined,
          varianteSku: d.sku,
          stockActual: d.stockDespues,
          stockMinimo: d.stockMinimo,
          tenantId: input.tenantId,
        })
      }
    }

    return resultado
  }
}
