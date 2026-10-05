import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"
import type { ILectorVerticales } from "../../../tenant/domain/ports/IActivadorVertical.js"
import { validarDesactivacion } from "../../../tenant/domain/capacidades.js"

export class DesactivarTiendaUseCase {
  constructor(
    private readonly repo: ITiendaRepository,
    private readonly lector?: ILectorVerticales,
  ) {}

  async execute(tenantId: string) {
    if (this.lector) validarDesactivacion(await this.lector.verticalesActivas(tenantId), "tienda")
    await this.repo.desactivar(tenantId)
    return { esTienda: false }
  }
}
