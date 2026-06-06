import type { IConsultorioPublicoRepository, ConsultorioPublicoConfig } from "../../domain/ports/IConsultorioPublicoRepository.js"
import type { IConsultorioPublicoNotificador } from "../../domain/ports/IConsultorioPublicoNotificador.js"

export class ActualizarConfiguracionPublicaConsultorioUseCase {
  constructor(
    private readonly repo: IConsultorioPublicoRepository,
    private readonly notificador: IConsultorioPublicoNotificador,
  ) {}

  async ejecutar(slug: string, data: Partial<ConsultorioPublicoConfig>, updatedById?: string): Promise<ConsultorioPublicoConfig> {
    const { consultorioId, tenantId } = await this.repo.resolveConsultorioInfo(slug)
    const resultado = await this.repo.actualizarConfiguracion(consultorioId, data, updatedById)
    this.notificador.emitirPerfilActualizado(tenantId, { consultorioSlug: slug })
    return resultado
  }
}
