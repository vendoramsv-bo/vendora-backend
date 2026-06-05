import type { IRestaurantePublicoRepository } from "../../domain/ports/IRestaurantePublicoRepository.js"
import type { IRestaurantePublicoNotificador } from "../../domain/ports/IRestaurantePublicoNotificador.js"
import {
  PerfilNoEncontradoError,
  TipoServicioSinReservasError,
  ReservaFechaInvalidaError,
} from "../../domain/restaurante-publico.errors.js"
import { prismaBase } from "../../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export interface CrearReservaConsumerInput {
  slug: string
  userId: string
  fechaLlegada: Date
  numeroComensales: number
  observaciones?: string | null
}

export class CrearReservaConsumerUseCase {
  constructor(
    private readonly repo: IRestaurantePublicoRepository,
    private readonly notificador: IRestaurantePublicoNotificador,
  ) {}

  async ejecutar(input: CrearReservaConsumerInput): Promise<{
    id: string
    codigo: string
    fechaLlegada: string
    numeroComensales: number
    estado: string
    restaurante: { nombre: string; slug: string }
  }> {
    // Validate fecha
    if (input.fechaLlegada <= new Date()) throw new ReservaFechaInvalidaError()

    // Resolve restaurante by slug
    const tenant = await db.tenant.findFirst({
      where: { slug: input.slug, esRestaurante: true },
      select: { id: true, name: true },
    })
    if (!tenant) throw new PerfilNoEncontradoError(input.slug)

    const restaurante = await db.restaurante.findUnique({
      where: { tenantId: tenant.id },
      select: { id: true, tipoServicio: true },
    })
    if (!restaurante) throw new PerfilNoEncontradoError(input.slug)

    // Validate tipoServicio
    const tipoServicio: string | null = restaurante.tipoServicio
    if (tipoServicio === "DELIVERY" || tipoServicio === "PARA_LLEVAR") {
      throw new TipoServicioSinReservasError(tipoServicio)
    }

    const reserva = await this.repo.crearReservaPublica({
      restauranteId: restaurante.id,
      tenantId: tenant.id,
      userId: input.userId,
      fechaLlegada: input.fechaLlegada,
      numeroComensales: input.numeroComensales,
      observaciones: input.observaciones,
    })

    this.notificador.notificarNuevaReserva(tenant.id, reserva.id, reserva.codigo, input.slug)

    return {
      id: reserva.id,
      codigo: reserva.codigo,
      fechaLlegada: reserva.fechaLlegada.toISOString(),
      numeroComensales: reserva.numeroComensales,
      estado: reserva.estado,
      restaurante: { nombre: tenant.name, slug: input.slug },
    }
  }
}
