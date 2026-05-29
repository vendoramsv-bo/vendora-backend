import type { IRecetaProductoRepository } from "../../domain/ports/IRecetaProductoRepository.js"
import type { ISalidaAlmacenRepository } from "../../domain/ports/ISalidaAlmacenRepository.js"
import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import { InsumoNoEncontradoError } from "../../domain/almacen.errors.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

export interface RegistrarConsumoInput {
  tenantId: string
  productoId: string
  varianteId?: string
  cantidad: number
  motivo?: string
  forzar?: boolean
  createdById?: string
  tenantMemberId?: string
}

export class RegistrarConsumoUseCase {
  constructor(
    private readonly recetaRepo: IRecetaProductoRepository,
    private readonly salidaRepo: ISalidaAlmacenRepository,
    private readonly insumoRepo: IInsumoRepository,
    private readonly notificador: IAlmacenNotificador
  ) {}

  async execute(input: RegistrarConsumoInput) {
    const receta = input.varianteId
      ? await this.recetaRepo.findByVariante(input.productoId, input.varianteId)
      : await this.recetaRepo.findByProducto(input.productoId)

    if (receta.length === 0) return { salidaId: null, detalles: [], advertencias: [] }

    for (const linea of receta) {
      const insumo = await this.insumoRepo.findById(linea.insumoId, input.tenantId)
      if (!insumo) throw new InsumoNoEncontradoError(linea.insumoId)
    }

    const borrador = await this.salidaRepo.create({
      tenantId: input.tenantId,
      descripcion: input.motivo ?? `Consumo producto ${input.productoId}`,
      detalles: receta.map((l) => ({ insumoId: l.insumoId, cantidad: l.cantidad * input.cantidad })),
      createdById: input.createdById,
      tenantMemberId: input.tenantMemberId,
    })

    const resultado = await this.salidaRepo.aprobarSalida({
      salidaId: borrador.salidaId,
      tenantId: input.tenantId,
      version: borrador.version,
      aprobadoPorId: input.createdById,
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
