import type {
  ActualizarRecuentoAlmacenDTO,
  IRecuentoAlmacenRepository,
} from "../../domain/ports/IRecuentoAlmacenRepository.js"
import type { IAlmacenNotificador } from "../../domain/ports/IAlmacenNotificador.js"
import { DocumentoNoEncontradoError, validarFechaDocumento } from "../../domain/almacen.errors.js"
import { evaluarStockCritico } from "../shared/evaluar-stock-critico.js"

/** El detalle de un recuento de almacén (spec 033, B-05). */
export class ObtenerRecuentoAlmacenUseCase {
  constructor(private readonly repo: IRecuentoAlmacenRepository) {}

  async execute(id: string, tenantId: string) {
    const doc = await this.repo.obtener(id, tenantId)
    if (!doc) throw new DocumentoNoEncontradoError("RECUENTO_ALMACEN", id)
    return doc
  }
}

/** Editar un recuento pendiente: cabecera y/o líneas (las líneas se reemplazan). */
export class ActualizarRecuentoAlmacenUseCase {
  constructor(private readonly repo: IRecuentoAlmacenRepository) {}

  async execute(id: string, tenantId: string, dto: ActualizarRecuentoAlmacenDTO) {
    validarFechaDocumento(dto.fecha)
    return this.repo.actualizar(id, tenantId, dto)
  }
}

/** Eliminar un recuento pendiente; uno aprobado ya cambió el stock y no se elimina. */
export class EliminarRecuentoAlmacenUseCase {
  constructor(private readonly repo: IRecuentoAlmacenRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    await this.repo.eliminar(id, tenantId)
  }
}

export interface AprobarRecuentoAlmacenInput {
  recuentoId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
}

/**
 * Aprobar un recuento: el stock de cada insumo pasa a ser lo contado y queda un
 * movimiento RECUENTO por línea. Avisa los insumos que cruzaron su stock mínimo, como
 * hacía el registro antes de la 033.
 */
export class AprobarRecuentoAlmacenUseCase {
  constructor(
    private readonly repo: IRecuentoAlmacenRepository,
    private readonly notificador: IAlmacenNotificador,
  ) {}

  async execute(input: AprobarRecuentoAlmacenInput) {
    const { doc, cambios } = await this.repo.aprobar(input)
    for (const c of cambios) {
      const evento = evaluarStockCritico(c.stockAntes, c.stockDespues, c.stockMinimo)
      const payload = {
        insumoId: c.insumoId,
        insumoNombre: c.insumoNombre,
        stockActual: c.stockDespues,
        stockMinimo: c.stockMinimo,
        tenantId: input.tenantId,
      }
      if (evento === "critico") this.notificador.insumoStockCritico(input.tenantId, payload)
      else if (evento === "normalizado") this.notificador.insumoStockNormalizado(input.tenantId, payload)
    }
    return doc
  }
}
