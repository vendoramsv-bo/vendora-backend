import type { IRecetaMedicaRepository, RecetaCreateDTO } from "../../domain/ports/IRecetaMedicaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { RecetaMedicaEntity } from "../../domain/receta-medica.entity.js"

export class CrearRecetaUseCase {
  constructor(
    private readonly repo: IRecetaMedicaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(data: RecetaCreateDTO, consultorioId: string, userId: string, tenantId: string): Promise<RecetaMedicaEntity> {
    const receta = await this.repo.crear(data, consultorioId, userId)

    this.notificador.recetaEmitida(tenantId, {
      recetaId: receta.id,
      numeroReceta: receta.numeroReceta,
      medicoId: receta.medicoId,
      pacienteId: receta.pacienteId,
      atencionId: receta.atencionId,
      tenantId,
    })

    return receta
  }
}
