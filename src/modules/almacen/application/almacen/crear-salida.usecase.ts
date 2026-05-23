import type { ISalidaAlmacenRepository } from "../../domain/ports/ISalidaAlmacenRepository.js"
import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import {
  InsumoNoEncontradoError,
  DetalleVacioError,
  StockInsuficienteError,
} from "../../domain/almacen.errors.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface SalidaDetalleInput {
  insumoId: string
  cantidad: number
}

export interface CrearSalidaInput {
  tenantId: string
  descripcion?: string
  detalles: SalidaDetalleInput[]
  forzar?: boolean
  createdById?: string
  tenantMemberId?: string
}

export class CrearSalidaUseCase {
  constructor(
    private readonly salidaRepo: ISalidaAlmacenRepository,
    private readonly insumoRepo: IInsumoRepository,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: CrearSalidaInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()

    const insumosAntes: Array<{ id: string; stockAntes: number; stockMinimo: number; nombre: string }> = []

    for (const d of input.detalles) {
      const ins = await this.insumoRepo.findById(d.insumoId, input.tenantId)
      if (!ins) throw new InsumoNoEncontradoError(d.insumoId)
      if (!input.forzar && ins.cantidadStock < d.cantidad) {
        throw new StockInsuficienteError(
          `Stock insuficiente para insumo "${ins.nombre}": disponible ${ins.cantidadStock}, requerido ${d.cantidad}`
        )
      }
      insumosAntes.push({ id: ins.id, stockAntes: ins.cantidadStock, stockMinimo: ins.stockMinimo, nombre: ins.nombre })
    }

    const resultado = await this.salidaRepo.create({
      tenantId: input.tenantId,
      descripcion: input.descripcion,
      detalles: input.detalles,
      forzar: input.forzar,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })

    for (const d of resultado.detalles) {
      const antes = insumosAntes.find((a) => a.id === d.insumoId)
      if (!antes) continue
      const evento = evaluarStockCritico(antes.stockAntes, d.stockDespues, d.stockMinimo)
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
