import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import {
  InsumoNoEncontradoError,
  MotivoRequeridoError,
  InsumoVencidoWarning,
} from "../../domain/almacen.errors.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface RegistrarAjusteInsumoInput {
  insumoId: string
  tenantId: string
  cantidadAjuste: number
  motivo: string
  createdById?: string
}

export interface RegistrarAjusteInsumoOutput {
  insumoId: string
  stockAntes: number
  stockDespues: number
  advertencia?: string
}

export class RegistrarAjusteInsumoUseCase {
  constructor(
    private readonly repo: IInsumoRepository,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: RegistrarAjusteInsumoInput): Promise<RegistrarAjusteInsumoOutput> {
    if (!input.motivo?.trim()) throw new MotivoRequeridoError()

    const insumo = await this.repo.findById(input.insumoId, input.tenantId)
    if (!insumo) throw new InsumoNoEncontradoError(input.insumoId)

    const vencido = insumo.fechaVencimiento != null && insumo.fechaVencimiento < new Date()

    const resultado = await this.repo.registrarAjuste({
      insumoId: input.insumoId,
      tenantId: input.tenantId,
      cantidadAjuste: input.cantidadAjuste,
      motivo: input.motivo,
      createdById: input.createdById,
    })

    const evento = evaluarStockCritico(resultado.stockAntes, resultado.stockDespues, resultado.stockMinimo)
    if (evento === "critico") {
      this.notificador.insumoStockCritico(input.tenantId, {
        insumoId: input.insumoId,
        insumoNombre: resultado.insumoNombre,
        stockActual: resultado.stockDespues,
        stockMinimo: resultado.stockMinimo,
        tenantId: input.tenantId,
      })
    } else if (evento === "normalizado") {
      this.notificador.insumoStockNormalizado(input.tenantId, {
        insumoId: input.insumoId,
        insumoNombre: resultado.insumoNombre,
        stockActual: resultado.stockDespues,
        stockMinimo: resultado.stockMinimo,
        tenantId: input.tenantId,
      })
    }

    return {
      insumoId: input.insumoId,
      stockAntes: resultado.stockAntes,
      stockDespues: resultado.stockDespues,
      advertencia: vencido ? new InsumoVencidoWarning(insumo.nombre).code : undefined,
    }
  }
}
