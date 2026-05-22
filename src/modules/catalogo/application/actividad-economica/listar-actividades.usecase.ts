import type { IActividadEconomicaRepository } from "../../domain/ports/IActividadEconomicaRepository.js"
import type { ActividadEconomicaEntity } from "../../domain/actividad-economica.entity.js"

export class ListarActividadesUseCase {
  constructor(private readonly repo: IActividadEconomicaRepository) {}

  async ejecutar(tenantId: string): Promise<{ actividades: ActividadEconomicaEntity[]; clasificadores: Array<{ id: string; nombre: string; descripcion?: string | null }> }> {
    const [actividades, clasificadores] = await Promise.all([
      this.repo.listar(tenantId),
      this.repo.listarClasificadores(),
    ])
    return { actividades, clasificadores }
  }
}
