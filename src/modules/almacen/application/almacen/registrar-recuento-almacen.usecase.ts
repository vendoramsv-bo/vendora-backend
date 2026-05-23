import type { IRecuentoAlmacenRepository } from "../../domain/ports/IRecuentoAlmacenRepository.js"
import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import { InsumoNoEncontradoError, DetalleVacioError } from "../../domain/almacen.errors.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface RecuentoAlmacenDetalleInput {
  insumoId: string
  stockFisico: number
}

export interface RegistrarRecuentoAlmacenInput {
  tenantId: string
  observacion?: string
  detalles: RecuentoAlmacenDetalleInput[]
  createdById?: string
  tenantMemberId?: string
}

export class RegistrarRecuentoAlmacenUseCase {
  constructor(
    private readonly recuentoRepo: IRecuentoAlmacenRepository,
    private readonly insumoRepo: IInsumoRepository,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: RegistrarRecuentoAlmacenInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()

    const insumosAntes: Array<{ id: string; stockAntes: number; stockMinimo: number; nombre: string }> = []

    for (const d of input.detalles) {
      const ins = await this.insumoRepo.findById(d.insumoId, input.tenantId)
      if (!ins) throw new InsumoNoEncontradoError(d.insumoId)
      insumosAntes.push({ id: ins.id, stockAntes: ins.cantidadStock, stockMinimo: ins.stockMinimo, nombre: ins.nombre })
    }

    const resultado = await this.recuentoRepo.create({
      tenantId: input.tenantId,
      observacion: input.observacion,
      detalles: input.detalles,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })

    for (const d of resultado.detalles) {
      const antes = insumosAntes.find((a) => a.id === d.insumoId)
      if (!antes) continue
      const evento = evaluarStockCritico(antes.stockAntes, d.stockFisico, d.stockMinimo)
      if (evento === "critico") {
        this.notificador.insumoStockCritico(input.tenantId, {
          insumoId: d.insumoId,
          insumoNombre: d.insumoNombre,
          stockActual: d.stockFisico,
          stockMinimo: d.stockMinimo,
          tenantId: input.tenantId,
        })
      } else if (evento === "normalizado") {
        this.notificador.insumoStockNormalizado(input.tenantId, {
          insumoId: d.insumoId,
          insumoNombre: d.insumoNombre,
          stockActual: d.stockFisico,
          stockMinimo: d.stockMinimo,
          tenantId: input.tenantId,
        })
      }
    }

    return resultado
  }
}
