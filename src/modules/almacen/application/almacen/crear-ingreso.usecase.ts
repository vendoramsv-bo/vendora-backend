import type { IIngresoAlmacenRepository } from "../../domain/ports/IIngresoAlmacenRepository.js"
import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import {
  ProveedorNoEncontradoError,
  InsumoNoEncontradoError,
  DetalleVacioError,
} from "../../domain/almacen.errors.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface IngresoDetalleInput {
  insumoId: string
  cantidad: number
  costoUnitario?: number
  lote?: string
  fechaVencimiento?: Date
  observaciones?: string
}

export interface CrearIngresoInput {
  tenantId: string
  proveedorId: string
  descripcion?: string
  detalles: IngresoDetalleInput[]
  createdById?: string
  tenantMemberId?: string
}

export class CrearIngresoUseCase {
  constructor(
    private readonly ingresoRepo: IIngresoAlmacenRepository,
    private readonly insumoRepo: IInsumoRepository,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly db: any,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: CrearIngresoInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()

    // Verificar proveedor pertenece al tenant
    const proveedor = await this.db.proveedor.findFirst({
      where: { id: input.proveedorId, tenantId: input.tenantId },
    })
    if (!proveedor) throw new ProveedorNoEncontradoError(input.proveedorId)

    // Capturar stocks previos para evaluar eventos post-transacción
    const insumosAntes: Array<{ id: string; stockAntes: number; stockMinimo: number; nombre: string }> = []
    const advertencias: string[] = []
    const now = new Date()

    for (const d of input.detalles) {
      const ins = await this.insumoRepo.findById(d.insumoId, input.tenantId)
      if (!ins) throw new InsumoNoEncontradoError(d.insumoId)
      if (ins.fechaVencimiento && ins.fechaVencimiento < now) {
        advertencias.push(`INSUMO_VENCIDO:${ins.nombre}`)
      }
      insumosAntes.push({ id: ins.id, stockAntes: ins.cantidadStock, stockMinimo: ins.stockMinimo, nombre: ins.nombre })
    }

    const resultado = await this.ingresoRepo.create({
      tenantId: input.tenantId,
      proveedorId: input.proveedorId,
      descripcion: input.descripcion,
      detalles: input.detalles,
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })

    // Post-transacción: emitir eventos por cada insumo cuyo stock cruzó el mínimo
    for (const d of resultado.detalles) {
      const antes = insumosAntes.find((a) => a.id === d.insumoId)
      if (!antes) continue
      const evento = evaluarStockCritico(antes.stockAntes, d.stockDespues, d.stockMinimo)
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

    return { ...resultado, advertencias }
  }
}
