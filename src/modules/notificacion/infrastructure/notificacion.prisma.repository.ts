import type {
  INotificacionRepository,
  NotificacionDTO,
  CrearNotificacionDTO,
} from "../domain/ports/INotificacionRepository.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

/* eslint-disable @typescript-eslint/no-explicit-any */

interface NotificacionRaw {
  id: string
  titulo: string
  mensaje: string
  fecha: Date
  estado: string
  referenciaTipo: string | null
  referenciaId: string | null
}

function aDTO(raw: NotificacionRaw): NotificacionDTO {
  return {
    id: raw.id,
    titulo: raw.titulo,
    mensaje: raw.mensaje,
    fecha: raw.fecha.toISOString(),
    leida: raw.estado === "LEIDO",
    referenciaTipo: raw.referenciaTipo,
    referenciaId: raw.referenciaId,
  }
}

const SELECT = {
  id: true,
  titulo: true,
  mensaje: true,
  fecha: true,
  estado: true,
  referenciaTipo: true,
  referenciaId: true,
}

/**
 * Notificaciones personales (spec 019 — cambio B7).
 *
 * El modelo `Notificacion` existía en el schema desde siempre, pero sin
 * repositorio, ni casos de uso, ni rutas, ni emisión: el evento
 * `notifications:unread:count` estaba declarado en `@vendora/realtime` y el panel
 * lo escuchaba, pero nadie lo emitía. El contador estaba en cero permanente.
 *
 * Recibe el cliente por constructor para poder probarse sin base real.
 */
export class NotificacionPrismaRepository implements INotificacionRepository {
  constructor(private readonly db: any = prismaBase) {}

  async listarPorUsuario(
    userId: string,
    params: { take: number; page: number },
  ): Promise<{ data: NotificacionDTO[]; total: number }> {
    const take = Math.min(100, Math.max(1, params.take))
    const skip = (Math.max(1, params.page) - 1) * take

    const [data, total] = await Promise.all([
      this.db.notificacion.findMany({
        where: { userId },
        select: SELECT,
        orderBy: { fecha: "desc" },
        take,
        skip,
      }),
      this.db.notificacion.count({ where: { userId } }),
    ])

    return { data: data.map(aDTO), total }
  }

  async contarNoLeidas(userId: string): Promise<number> {
    return this.db.notificacion.count({ where: { userId, estado: "NO_LEIDO" } })
  }

  async marcarLeida(id: string, userId: string): Promise<NotificacionDTO | null> {
    // El `userId` va en el where, no en un chequeo posterior: es lo que impide
    // que alguien marque como leída una notificación ajena.
    const resultado = await this.db.notificacion.updateMany({
      where: { id, userId },
      data: { estado: "LEIDO", leido: new Date() },
    })
    if (resultado.count === 0) return null

    const actualizada = await this.db.notificacion.findUnique({ where: { id }, select: SELECT })
    return actualizada ? aDTO(actualizada) : null
  }

  async crear(dto: CrearNotificacionDTO): Promise<NotificacionDTO> {
    const creada = await this.db.notificacion.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        actorUserId: dto.actorUserId,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        referenciaTipo: dto.referenciaTipo ?? null,
        referenciaId: dto.referenciaId ?? null,
      },
      select: SELECT,
    })
    return aDTO(creada)
  }
}
