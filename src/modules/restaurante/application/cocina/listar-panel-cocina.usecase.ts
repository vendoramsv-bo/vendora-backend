import type { IReservaRepository } from "../../domain/ports/IReservaRepository.js"
import type { ReservaEntity } from "../../domain/reserva.entity.js"
import type { ReservaDetalleEntity } from "../../domain/reserva-detalle.entity.js"

const ESTADOS_ACTIVOS_COCINA = ["CONFIRMADA", "EN_PREPARACION"]

export interface PanelCocinaItem {
  reserva: ReservaEntity
  detalles: ReservaDetalleEntity[]
}

export class ListarPanelCocinaUseCase {
  constructor(private readonly repo: IReservaRepository) {}

  async ejecutar(restauranteId: string): Promise<PanelCocinaItem[]> {
    const reservas = await this.repo.findAllByRestaurante(restauranteId, {})

    const activas = reservas.filter((r) => ESTADOS_ACTIVOS_COCINA.includes(r.estado))

    const resultado: PanelCocinaItem[] = []
    for (const reserva of activas) {
      const full = await this.repo.findById(reserva.id, restauranteId)
      if (full) {
        resultado.push({ reserva, detalles: full.detalles ?? [] })
      }
    }

    return resultado.sort((a, b) => a.reserva.fechaLlegada.getTime() - b.reserva.fechaLlegada.getTime())
  }
}
