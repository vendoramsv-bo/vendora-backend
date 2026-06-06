import type { IConsultorioPublicoRepository, CitaRaw } from "../../domain/ports/IConsultorioPublicoRepository.js"
import type { IConsultorioPublicoNotificador } from "../../domain/ports/IConsultorioPublicoNotificador.js"
import { MedicoNoDisponibleError, ServicioNoDisponibleError } from "../../domain/consultorio-publico.errors.js"

export class CrearCitaOnlineUseCase {
  constructor(
    private readonly repo: IConsultorioPublicoRepository,
    private readonly notificador: IConsultorioPublicoNotificador,
  ) {}

  async ejecutar(slug: string, input: { medicoId: string; servicioId: string; fechaHora: Date; motivo?: string }, consumerUserId: string): Promise<CitaRaw> {
    const { consultorioId, tenantId } = await this.repo.resolveConsultorioInfo(slug)

    const [horarios, servicio] = await Promise.all([
      this.repo.getMedicoHorarios(input.medicoId, consultorioId),
      this.repo.getServicio(input.servicioId, consultorioId),
    ])

    if (horarios.length === 0) throw new MedicoNoDisponibleError()
    if (!servicio || !servicio.visiblePublico) throw new ServicioNoDisponibleError()

    const cita = await this.repo.crearCitaOnline({
      consultorioId,
      medicoId: input.medicoId,
      servicioId: input.servicioId,
      consumerUserId,
      fechaHora: input.fechaHora,
      duracionMin: servicio.duracionMin,
      motivo: input.motivo,
    })

    this.notificador.emitirNuevaCitaOnline(tenantId, {
      consultorioSlug: slug,
      citaId: cita.id,
      fechaHora: cita.fechaHora,
      medicoId: cita.medicoId,
    })

    return cita
  }
}
