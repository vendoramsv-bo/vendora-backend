import type { IActividadEconomicaRepository } from "../../domain/ports/IActividadEconomicaRepository.js"
import type { ActividadEconomicaEntity } from "../../domain/actividad-economica.entity.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { ActividadDuplicada } from "../../domain/catalogo.errors.js"

export class CrearActividadUseCase {
  constructor(
    private readonly repo: IActividadEconomicaRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(claActividadId: string, tenantId: string, userId: string): Promise<ActividadEconomicaEntity> {
    const existentes = await this.repo.listar(tenantId)
    const yaExiste = existentes.some((a) => a.claActividadId === claActividadId)
    if (yaExiste) throw new ActividadDuplicada()

    const actividad = await this.repo.crear({ claActividadId }, tenantId, userId)

    this.notificador.actividadCreada(tenantId, {
      tenantId,
      actividadId: actividad.id,
      nombre: actividad.nombre,
    })

    return actividad
  }
}
