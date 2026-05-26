import type { IReservaRepository } from "../../domain/ports/IReservaRepository.js"
import type { IRestauranteNotificador } from "../../domain/ports/IRestauranteNotificador.js"
import type { ReservaEntity } from "../../domain/reserva.entity.js"
import { ReservaNoEncontrada, RolSinPermiso } from "../../domain/restaurante.errors.js"

const ESTADOS_PERMITIDOS_POR_ROL: Record<string, string[]> = {
  PROPIETARIO: ["CONFIRMADA", "EN_PREPARACION", "LISTA", "ENTREGADA", "CANCELADA", "NO_ASISTIO"],
  ADMIN: ["CONFIRMADA", "EN_PREPARACION", "LISTA", "ENTREGADA", "CANCELADA", "NO_ASISTIO"],
  ENCARGADO: ["CONFIRMADA", "EN_PREPARACION", "LISTA", "ENTREGADA", "CANCELADA", "NO_ASISTIO"],
  MESERO: ["CONFIRMADA", "EN_PREPARACION", "LISTA", "ENTREGADA", "CANCELADA", "NO_ASISTIO"],
  CHEF: [],
  VENDEDOR: [],
}

export class CambiarEstadoReservaUseCase {
  constructor(
    private readonly repo: IReservaRepository,
    private readonly notificador: IRestauranteNotificador,
  ) {}

  async ejecutar(
    id: string,
    restauranteId: string,
    tenantId: string,
    nuevoEstado: string,
    userId: string,
    rol: string,
    opciones?: { numeroMesa?: string; nota?: string },
  ): Promise<ReservaEntity> {
    const reserva = await this.repo.findById(id, restauranteId)
    if (!reserva) throw new ReservaNoEncontrada(id)

    const estadosPermitidos = ESTADOS_PERMITIDOS_POR_ROL[rol] ?? []
    if (!estadosPermitidos.includes(nuevoEstado)) throw new RolSinPermiso(rol, nuevoEstado)

    reserva.validarTransicion(nuevoEstado)

    const estadoAnterior = reserva.estado
    const updateData: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === "CONFIRMADA") {
      updateData.fechaConfirmacion = new Date()
      updateData.atendidaPorId = userId
      if (opciones?.numeroMesa) updateData.numeroMesa = opciones.numeroMesa
    }
    if (nuevoEstado === "CANCELADA") {
      updateData.fechaCancelacion = new Date()
      updateData.motivoCancelacion = opciones?.nota ?? null
    }

    const actualizada = await this.repo.update(id, updateData, userId)
    await this.repo.logEstadoCambio(id, estadoAnterior, nuevoEstado, userId, opciones?.nota)

    this.notificador.reservaActualizada(tenantId, {
      reservaId: actualizada.id,
      codigo: actualizada.codigo,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      cambiadoPorId: userId,
      fecha: new Date().toISOString(),
      tenantId,
    })

    return actualizada
  }
}
