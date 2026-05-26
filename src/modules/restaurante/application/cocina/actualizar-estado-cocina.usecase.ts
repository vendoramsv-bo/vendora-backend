import type { IReservaRepository } from "../../domain/ports/IReservaRepository.js"
import type { IReservaDetalleRepository } from "../../domain/ports/IReservaDetalleRepository.js"
import type { IRestauranteNotificador } from "../../domain/ports/IRestauranteNotificador.js"
import type { ReservaDetalleEntity } from "../../domain/reserva-detalle.entity.js"
import { ReservaNoEncontrada, TransicionCocinaInvalida, RolSinPermiso } from "../../domain/restaurante.errors.js"

const TRANSICIONES_COCINA: Record<string, Record<string, string[]>> = {
  CHEF: {
    PENDIENTE: ["EN_PREPARACION"],
    EN_PREPARACION: ["LISTO"],
  },
  MESERO: {
    LISTO: ["ENTREGADO"],
  },
  ENCARGADO: {
    PENDIENTE: ["EN_PREPARACION"],
    EN_PREPARACION: ["LISTO"],
    LISTO: ["ENTREGADO"],
  },
  ADMIN: {
    PENDIENTE: ["EN_PREPARACION"],
    EN_PREPARACION: ["LISTO"],
    LISTO: ["ENTREGADO"],
  },
  PROPIETARIO: {
    PENDIENTE: ["EN_PREPARACION"],
    EN_PREPARACION: ["LISTO"],
    LISTO: ["ENTREGADO"],
  },
}

export class ActualizarEstadoCocinaUseCase {
  constructor(
    private readonly reservaRepo: IReservaRepository,
    private readonly detalleRepo: IReservaDetalleRepository,
    private readonly notificador: IRestauranteNotificador,
  ) {}

  async ejecutar(
    detalleId: string,
    nuevoEstadoCocina: string,
    userId: string,
    rol: string,
    tenantId: string,
  ): Promise<ReservaDetalleEntity> {
    const detalle = await this.detalleRepo.findById(detalleId)
    if (!detalle) throw new ReservaNoEncontrada(detalleId)

    const reserva = await this.reservaRepo.findById(detalle.reservaId)
    if (!reserva) throw new ReservaNoEncontrada(detalle.reservaId)

    const transicionesPorRol = TRANSICIONES_COCINA[rol] ?? {}
    const transicionesValidas = transicionesPorRol[detalle.estadoCocina] ?? []
    if (!transicionesValidas.includes(nuevoEstadoCocina)) {
      if (!Object.values(TRANSICIONES_COCINA).some((t) => (t[detalle.estadoCocina] ?? []).includes(nuevoEstadoCocina))) {
        throw new TransicionCocinaInvalida(detalle.estadoCocina, nuevoEstadoCocina)
      }
      throw new RolSinPermiso(rol, nuevoEstadoCocina)
    }

    const estadoAnterior = detalle.estadoCocina
    const actualizado = await this.detalleRepo.updateEstadoCocina(detalleId, nuevoEstadoCocina)

    await this.reservaRepo.logEstadoCambio(
      detalle.reservaId,
      null,
      reserva.estado,
      userId,
      `ITEM:${detalleId}:${nuevoEstadoCocina}`,
    )

    this.notificador.platoCocinaActualizado(tenantId, {
      reservaId: reserva.id,
      codigo: reserva.codigo,
      detalleId,
      productoNombre: detalle.productoNombre,
      estadoAnterior,
      estadoNuevo: nuevoEstadoCocina,
      cambiadoPorId: userId,
      fecha: new Date().toISOString(),
      tenantId,
    })

    // Auto-advance reserva to LISTA when all items are ENTREGADO
    if (nuevoEstadoCocina === "ENTREGADO") {
      const pendientes = await this.detalleRepo.countByEstadoCocina(detalle.reservaId, "PENDIENTE")
      const enPrep = await this.detalleRepo.countByEstadoCocina(detalle.reservaId, "EN_PREPARACION")
      const listos = await this.detalleRepo.countByEstadoCocina(detalle.reservaId, "LISTO")

      if (pendientes === 0 && enPrep === 0 && listos === 0 && reserva.estaActiva()) {
        try {
          reserva.validarTransicion("LISTA")
          await this.reservaRepo.update(detalle.reservaId, { estado: "LISTA" }, userId)
          await this.reservaRepo.logEstadoCambio(detalle.reservaId, reserva.estado, "LISTA", userId, "Auto-avance: todos los platos entregados")
        } catch {
          // Ignore transition errors — reserva may already be in a terminal state
        }
      }
    }

    return actualizado
  }
}
