import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import {
  VarianteNoEncontradaError,
  VarianteNoInicializadaError,
  DetalleVacioError,
} from "../../domain/almacen.errors.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface AjusteDetalleInput {
  productoId: string
  varianteId?: string
  cantidadAjuste: number
}

export interface RegistrarAjusteInput {
  tenantId: string
  motivo?: string
  detalles: AjusteDetalleInput[]
  createdById?: string
  tenantMemberId?: string
}

export class RegistrarAjusteUseCase {
  constructor(
    private readonly repo: IInventarioProductoRepository,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: RegistrarAjusteInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()

    // Verificar que todas las variantes existen y están inicializadas
    for (const d of input.detalles) {
      if (!d.varianteId) throw new VarianteNoEncontradaError()
      const variante = await this.repo.findVariante(d.varianteId, input.tenantId)
      if (!variante) throw new VarianteNoEncontradaError(d.varianteId)
      if (!variante.inventarioActivado) throw new VarianteNoInicializadaError(d.varianteId)
    }

    const resultado = await this.repo.registrarAjuste({
      tenantId: input.tenantId,
      motivo: input.motivo,
      detalles: input.detalles,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })

    // Post-transacción: evaluar y emitir eventos de stock crítico/normalizado
    for (const d of resultado.detalles) {
      const evento = evaluarStockCritico(d.stockAntes, d.stockDespues, d.stockMinimo)
      if (evento === "critico") {
        this.notificador.stockCritico(input.tenantId, {
          productoId: d.productoId,
          productoNombre: d.productoNombre,
          varianteId: d.varianteId,
          varianteSku: d.sku,
          stockActual: d.stockDespues,
          stockMinimo: d.stockMinimo,
          tenantId: input.tenantId,
        })
      } else if (evento === "normalizado") {
        this.notificador.stockNormalizado(input.tenantId, {
          productoId: d.productoId,
          productoNombre: d.productoNombre,
          varianteId: d.varianteId,
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
