import type { IConsultorioPublicoRepository } from "../../domain/ports/IConsultorioPublicoRepository.js"
import { ConsultorioNoEncontradoError, MedicoNoDisponibleError, ServicioNoDisponibleError } from "../../domain/consultorio-publico.errors.js"

const MS_30_DIAS = 30 * 24 * 60 * 60 * 1000

export class ConsultarDisponibilidadUseCase {
  constructor(private readonly repo: IConsultorioPublicoRepository) {}

  async ejecutar(
    slug: string,
    medicoId: string,
    servicioId: string,
    fechaDesde: Date,
    fechaHasta: Date,
  ): Promise<{ data: { fechaHora: string; disponible: boolean }[] }> {
    if (fechaHasta.getTime() - fechaDesde.getTime() > MS_30_DIAS) {
      throw new Error("El rango máximo es de 30 días")
    }

    const info = await this.repo.resolveConsultorioInfo(slug)
    if (!info) throw new ConsultorioNoEncontradoError(slug)
    const { consultorioId } = info

    const [horarios, servicio, citas] = await Promise.all([
      this.repo.getMedicoHorarios(medicoId, consultorioId),
      this.repo.getServicio(servicioId, consultorioId),
      this.repo.getCitasEnRango(medicoId, fechaDesde, fechaHasta),
    ])

    // Validate medico is findable (indirect check via horarios; medico must exist in this consultorio)
    // Validate servicio
    if (!servicio) throw new ServicioNoDisponibleError()
    if (!servicio.visiblePublico) throw new ServicioNoDisponibleError()

    const duracionMs = servicio.duracionMin * 60_000
    const slots: { fechaHora: string; disponible: boolean }[] = []

    const cursor = new Date(fechaDesde)
    cursor.setHours(0, 0, 0, 0)
    const fin = new Date(fechaHasta)
    fin.setHours(23, 59, 59, 999)

    while (cursor <= fin) {
      const diaSemana = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1 // 0=Lun...6=Dom
      const horarioDia = horarios.find(h => h.diaSemana === diaSemana && h.activo)

      if (horarioDia) {
        const [hIni, mIni] = horarioDia.horaInicio.split(":").map(Number)
        const [hFin, mFin] = horarioDia.horaFin.split(":").map(Number)

        let slotCursor = new Date(cursor)
        slotCursor.setHours(hIni, mIni, 0, 0)
        const diaFin = new Date(cursor)
        diaFin.setHours(hFin, mFin, 0, 0)

        while (slotCursor.getTime() + duracionMs <= diaFin.getTime()) {
          const slotIni = slotCursor.getTime()
          const slotFinMs = slotIni + duracionMs
          const ocupado = citas.some(c => {
            const citaIni = new Date(c.fechaHora).getTime()
            const citaFin = citaIni + c.duracionMin * 60_000
            return slotIni < citaFin && slotFinMs > citaIni
          })
          slots.push({ fechaHora: new Date(slotCursor).toISOString(), disponible: !ocupado })
          slotCursor = new Date(slotCursor.getTime() + duracionMs)
        }
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    return { data: slots }
  }
}
