import type { IRestaurantePublicoRepository } from "../../domain/ports/IRestaurantePublicoRepository.js"
import type { IRestaurantePublicoNotificador } from "../../domain/ports/IRestaurantePublicoNotificador.js"
import { prismaBase } from "../../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class CancelarReservaConsumerUseCase {
  constructor(
    private readonly repo: IRestaurantePublicoRepository,
    private readonly notificador: IRestaurantePublicoNotificador,
  ) {}

  async ejecutar(reservaId: string, userId: string): Promise<{ id: string; estado: string }> {
    const resultado = await this.repo.cancelarReservaPublica(reservaId, userId)

    // Emit notification with tenant context
    const reserva = await db.reserva.findUnique({
      where: { id: reservaId },
      include: { restaurante: { include: { tenant: { select: { id: true, slug: true } } } } },
    })
    if (reserva?.restaurante?.tenant) {
      const { id: tenantId, slug } = reserva.restaurante.tenant
      this.notificador.notificarReservaActualizada(tenantId, reservaId, reserva.codigo, resultado.estado, slug)
    }

    return resultado
  }
}
