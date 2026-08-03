import type {
  INotificacionRepository,
  CrearNotificacionDTO,
} from "../domain/ports/INotificacionRepository.js"
import type { INotificacionNotificador } from "../domain/ports/INotificacionNotificador.js"

/**
 * Casos de uso de notificaciones personales (spec 019 — cambio B7).
 *
 * Los cuatro viven en un archivo porque son cuatro operaciones de una línea sobre
 * la misma entidad: partirlos en cuatro archivos sería ceremonia sin beneficio.
 *
 * La regla que comparten: **crear y marcar leída reemiten el contador**. Sin eso,
 * el badge de la barra solo se actualizaría al recargar, y FR-033 pide que suba
 * sin que el visitante haga nada.
 */

export class ListarNotificacionesUseCase {
  constructor(private readonly repo: INotificacionRepository) {}

  async execute(userId: string, params: { take: number; page: number }) {
    return this.repo.listarPorUsuario(userId, params)
  }
}

export class ContarNoLeidasUseCase {
  constructor(private readonly repo: INotificacionRepository) {}

  async execute(userId: string) {
    return this.repo.contarNoLeidas(userId)
  }
}

export class MarcarLeidaUseCase {
  constructor(
    private readonly repo: INotificacionRepository,
    private readonly notificador: INotificacionNotificador,
  ) {}

  /** `null` si la notificación no era de ese usuario: la ruta responde 404. */
  async execute(id: string, userId: string) {
    const notificacion = await this.repo.marcarLeida(id, userId)
    if (!notificacion) return null

    this.notificador.contadorNoLeidas(userId, await this.repo.contarNoLeidas(userId))
    return notificacion
  }
}

export class CrearNotificacionUseCase {
  constructor(
    private readonly repo: INotificacionRepository,
    private readonly notificador: INotificacionNotificador,
  ) {}

  async execute(dto: CrearNotificacionDTO) {
    const notificacion = await this.repo.crear(dto)
    this.notificador.contadorNoLeidas(dto.userId, await this.repo.contarNoLeidas(dto.userId))
    return notificacion
  }
}
