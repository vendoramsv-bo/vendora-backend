import type { IIngresoAlmacenRepository } from "../../domain/ports/IIngresoAlmacenRepository.js"
import { DocumentoNoEncontradoError } from "../../domain/almacen.errors.js"

export class ObtenerIngresoUseCase {
  constructor(private readonly repo: IIngresoAlmacenRepository) {}

  async execute(id: string, tenantId: string) {
    const ingreso = await this.repo.obtenerIngreso(id, tenantId)
    if (!ingreso) throw new DocumentoNoEncontradoError("INGRESO", id)
    return ingreso
  }
}
