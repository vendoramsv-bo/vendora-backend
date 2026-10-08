import type {
  IRecuentoAlmacenRepository,
  RecuentoAlmacenDetalleDTO,
} from "../../domain/ports/IRecuentoAlmacenRepository.js"
import { DetalleVacioError, validarFechaDocumento } from "../../domain/almacen.errors.js"

export interface RegistrarRecuentoAlmacenInput {
  tenantId: string
  observacion?: string
  fecha?: Date
  detalles: RecuentoAlmacenDetalleDTO[]
  createdById?: string
  tenantMemberId?: string
}

/**
 * Registrar un recuento de almacén **pendiente** (spec 033, B-05).
 *
 * Hasta la 033 aplicaba lo contado al stock en el mismo paso. Ahora solo guarda lo
 * contado y la foto del stock del sistema; el stock cambia —y se avisan los cruces del
 * mínimo— recién al aprobar (`AprobarRecuentoAlmacenUseCase`).
 */
export class RegistrarRecuentoAlmacenUseCase {
  constructor(private readonly recuentoRepo: IRecuentoAlmacenRepository) {}

  async execute(input: RegistrarRecuentoAlmacenInput) {
    if (input.detalles.length === 0) throw new DetalleVacioError()
    validarFechaDocumento(input.fecha)
    return this.recuentoRepo.create(input)
  }
}
