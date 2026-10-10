import type { IClienteRepository } from "../../domain/ports/IClienteRepository.js"
import { ClienteNoEncontradoError, ClienteEnUsoError } from "../../domain/ventas.errors.js"

/** Elimina un cliente sin ventas ni reservas (spec 035). Con documentos, se inactiva. */
export class EliminarClienteUseCase {
  constructor(private readonly repo: IClienteRepository) {}

  async execute(id: string, tenantId: string) {
    const existente = await this.repo.obtenerPorId(id, tenantId)
    if (!existente) throw new ClienteNoEncontradoError(id)

    const enUso = await this.repo.tieneDocumentos(id, tenantId)
    if (enUso) throw new ClienteEnUsoError()

    return this.repo.eliminar(id, tenantId)
  }
}
