import type { IActividadEconomicaRepository } from "../../domain/ports/IActividadEconomicaRepository.js"
import { ActividadNoEncontrada, ActividadEnUso } from "../../domain/catalogo.errors.js"

export class DesactivarActividadUseCase {
  constructor(private readonly repo: IActividadEconomicaRepository) {}

  async ejecutar(id: string, tenantId: string, userId: string): Promise<void> {
    const actividad = await this.repo.obtener(id, tenantId)
    if (!actividad) throw new ActividadNoEncontrada(id)

    const enUso = await this.repo.tieneUsoActivo(id)
    if (enUso) throw new ActividadEnUso()

    await this.repo.desactivar(id, userId)
  }
}
