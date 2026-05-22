import type { IRecetaMedicaRepository } from "../../domain/ports/IRecetaMedicaRepository.js"
import type { IConsultorioNotificador } from "../../domain/ports/IConsultorioNotificador.js"
import type { RecetaMedicaEntity } from "../../domain/receta-medica.entity.js"
import { RecetaDespachada } from "../../domain/consultorio.errors.js"

export class AnularRecetaUseCase {
  constructor(
    private readonly repo: IRecetaMedicaRepository,
    private readonly notificador: IConsultorioNotificador,
  ) {}

  async ejecutar(id: string, userId: string, consultorioId: string, tenantId: string): Promise<RecetaMedicaEntity> {
    const receta = await this.repo.obtener(id, consultorioId)
    if (!receta.puedeAnularse()) throw new RecetaDespachada()

    const anulada = await this.repo.anular(id, userId)

    this.notificador.recetaEmitida(tenantId, {
      recetaId: anulada.id,
      numeroReceta: anulada.numeroReceta,
      medicoId: anulada.medicoId,
      pacienteId: anulada.pacienteId,
      atencionId: anulada.atencionId,
      tenantId,
    })

    return anulada
  }
}
