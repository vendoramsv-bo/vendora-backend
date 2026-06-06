import type {
  IConsultorioPublicoRepository,
  ConsultorioInfoResult,
  ConsultorioPublicoConfig,
  ConsultorioPublicoRaw,
  ConsultorioDirectorioItem,
  DirectorioParams,
  ServicioPublicoRaw,
  ServiciosParams,
  HorarioAtencion,
  CitaRaw,
  CrearCitaOnlineInput,
  MisCitasParams,
  CitasOnlineParams,
} from "../domain/ports/IConsultorioPublicoRepository.js"
import { ConsultorioNoEncontradoError, SlotNoDisponibleError } from "../domain/consultorio-publico.errors.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export class ConsultorioPublicoPrismaRepository implements IConsultorioPublicoRepository {

  async resolveConsultorioInfo(slug: string): Promise<ConsultorioInfoResult> {
    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true, esConsultorio: true, consultorio: { select: { id: true } } },
    })
    if (!tenant || !tenant.esConsultorio || !tenant.consultorio) throw new ConsultorioNoEncontradoError(slug)
    return { consultorioId: tenant.consultorio.id, tenantId: tenant.id }
  }

  async activarPerfil(tenantId: string, actorId: string): Promise<void> {
    await db.tenant.update({ where: { id: tenantId }, data: { esConsultorio: true } })
    const existing = await db.consultorio.findUnique({ where: { tenantId } })
    if (!existing) {
      await db.consultorio.create({ data: { tenantId, createdById: actorId } })
    }
  }

  async desactivarPerfil(tenantId: string, _actorId: string): Promise<void> {
    await db.tenant.update({ where: { id: tenantId }, data: { esConsultorio: false } })
  }

  async actualizarConfiguracion(consultorioId: string, data: ConsultorioPublicoConfig, updatedById?: string): Promise<ConsultorioPublicoConfig> {
    const updated = await db.consultorio.update({
      where: { id: consultorioId },
      data: { ...data, updatedById },
      select: { horarios: true, contactoPublico: true, tipoServicio: true, fotos: true, especialidades: true },
    })
    return updated
  }

  async obtenerPerfil(slug: string): Promise<ConsultorioPublicoRaw | null> {
    const tenant = await db.tenant.findFirst({
      where: { slug, esConsultorio: true },
      include: {
        consultorio: {
          include: {
            medicos: { where: { visiblePublico: true, estado: "ACTIVO" }, select: { id: true, especialidad: true, bio: true, fotoUrl: true, visiblePublico: true } },
            valoraciones: { where: { estado: "ACTIVO" }, select: { puntuacion: true } },
            seguidores: { select: { id: true } },
          },
        },
        localizaciones: { select: { latitud: true, longitud: true, direccion: true, ciudad: true } },
      },
    })
    if (!tenant?.consultorio) return null

    const vals = tenant.consultorio.valoraciones as Array<{ puntuacion: number }>
    const promedio = vals.length > 0 ? Math.round((vals.reduce((s: number, v: { puntuacion: number }) => s + v.puntuacion, 0) / vals.length) * 10) / 10 : null

    return {
      id: tenant.consultorio.id,
      tenantId: tenant.id,
      slug: tenant.slug,
      nombre: tenant.name,
      descripcion: tenant.descripcion,
      logo: tenant.logo,
      fotos: tenant.consultorio.fotos ?? [],
      especialidades: tenant.consultorio.especialidades ?? [],
      nroRegistro: tenant.consultorio.nroRegistro,
      tipoServicio: tenant.consultorio.tipoServicio ?? "PRESENCIAL",
      horarios: tenant.consultorio.horarios,
      contactoPublico: tenant.consultorio.contactoPublico,
      medicos: tenant.consultorio.medicos,
      promedioValoracion: promedio,
      totalValoraciones: vals.length,
      totalSeguidores: tenant.consultorio.seguidores.length,
      localizaciones: tenant.localizaciones.map((l: { latitud: number; longitud: number; direccion: string; ciudad: string }) => ({
        direccion: l.direccion,
        ciudad: l.ciudad,
        lat: l.latitud,
        lng: l.longitud,
      })),
    }
  }

  async listarDirectorio(params: DirectorioParams): Promise<{ data: ConsultorioDirectorioItem[]; total: number }> {
    const { lat, lon, especialidad, tipoServicio, orderBy = "puntuacion", order = "desc" } = params
    const take = Math.min(100, Math.max(1, params.take ?? 20))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take

    const where: Record<string, unknown> = { esConsultorio: true }
    const consultorioWhere: Record<string, unknown> = {}
    if (tipoServicio) consultorioWhere.tipoServicio = tipoServicio
    if (especialidad) consultorioWhere.especialidades = { has: especialidad }
    if (Object.keys(consultorioWhere).length > 0) where.consultorio = { is: consultorioWhere }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        include: {
          consultorio: {
            select: {
              id: true,
              tipoServicio: true,
              especialidades: true,
              valoraciones: { where: { estado: "ACTIVO" }, select: { puntuacion: true } },
              seguidores: { select: { id: true } },
            },
          },
          localizaciones: { select: { latitud: true, longitud: true, ciudad: true }, take: 1 },
        },
      }),
      db.tenant.count({ where }),
    ])

    type TenantRow = {
      slug: string; name: string; descripcion: string; logo: string | null
      consultorio: { tipoServicio: string; especialidades: string[]; valoraciones: { puntuacion: number }[]; seguidores: { id: string }[] } | null
      localizaciones: { latitud: number; longitud: number; ciudad: string }[]
    }

    let items = (tenants as TenantRow[]).filter(t => t.consultorio).map(t => {
      const vals = t.consultorio!.valoraciones
      const promedio = vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v.puntuacion, 0) / vals.length) * 10) / 10 : null
      const loc = t.localizaciones[0] ?? null
      const distanciaKm = lat != null && lon != null && loc ? haversineKm(lat, lon, loc.latitud, loc.longitud) : null
      return {
        slug: t.slug, nombre: t.name, descripcion: t.descripcion, logoUrl: t.logo,
        especialidades: t.consultorio!.especialidades ?? [],
        tipoServicio: t.consultorio!.tipoServicio ?? "PRESENCIAL",
        puntuacionPromedio: promedio, totalValoraciones: vals.length,
        totalSeguidores: t.consultorio!.seguidores.length, distanciaKm, ciudad: loc?.ciudad ?? null,
      }
    })

    if (lat != null && lon != null && orderBy === "distancia") {
      items = items.sort((a, b) => order === "asc" ? (a.distanciaKm ?? 999) - (b.distanciaKm ?? 999) : (b.distanciaKm ?? 999) - (a.distanciaKm ?? 999))
    } else if (orderBy === "puntuacion") {
      items = items.sort((a, b) => order === "asc" ? (a.puntuacionPromedio ?? 0) - (b.puntuacionPromedio ?? 0) : (b.puntuacionPromedio ?? 0) - (a.puntuacionPromedio ?? 0))
    } else if (orderBy === "seguidores") {
      items = items.sort((a, b) => order === "asc" ? a.totalSeguidores - b.totalSeguidores : b.totalSeguidores - a.totalSeguidores)
    }

    const paged = items.slice(skip, skip + take)
    return { data: paged, total }
  }

  async listarServiciosPublicos(consultorioId: string, params: ServiciosParams): Promise<{ data: ServicioPublicoRaw[]; total: number }> {
    const take = Math.min(100, Math.max(1, params.take ?? 20))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { consultorioId, visiblePublico: true, estado: "ACTIVO" }
    if (params.especialidad) where.especialidad = params.especialidad

    const [data, total] = await Promise.all([
      db.servicioMedico.findMany({ where, skip, take, orderBy: { nombre: "asc" } }),
      db.servicioMedico.count({ where }),
    ])
    return { data, total }
  }

  async setVisibilidadServicio(servicioId: string, consultorioId: string, visiblePublico: boolean, mostrarPrecio?: boolean): Promise<void> {
    await db.servicioMedico.update({
      where: { id: servicioId, consultorioId },
      data: { visiblePublico, ...(mostrarPrecio !== undefined ? { mostrarPrecio } : {}) },
    })
  }

  async setVisibilidadMedico(medicoId: string, consultorioId: string, visiblePublico: boolean): Promise<void> {
    await db.medico.update({ where: { id: medicoId, consultorioId }, data: { visiblePublico } })
  }

  async getServicio(servicioId: string, consultorioId: string): Promise<ServicioPublicoRaw | null> {
    return db.servicioMedico.findFirst({ where: { id: servicioId, consultorioId, estado: "ACTIVO" } })
  }

  async getMedicoHorarios(medicoId: string, _consultorioId: string): Promise<HorarioAtencion[]> {
    return db.horarioAtencion.findMany({ where: { medicoId } })
  }

  async getCitasEnRango(medicoId: string, desde: Date, hasta: Date): Promise<CitaRaw[]> {
    return db.cita.findMany({
      where: {
        medicoId,
        fechaHora: { gte: desde, lte: hasta },
        estado: { notIn: ["CANCELADA", "CANCELADA_CLIENTE", "RECHAZADA"] },
      },
    })
  }

  async crearCitaOnline(data: CrearCitaOnlineInput): Promise<CitaRaw> {
    return db.$transaction(async (tx: typeof db) => {
      const conflicto = await tx.cita.findFirst({
        where: {
          medicoId: data.medicoId,
          fechaHora: data.fechaHora,
          estado: { notIn: ["CANCELADA", "CANCELADA_CLIENTE", "RECHAZADA"] },
        },
      })
      if (conflicto) throw new SlotNoDisponibleError()

      return tx.cita.create({
        data: {
          consultorioId: data.consultorioId,
          medicoId: data.medicoId,
          servicioId: data.servicioId,
          pacienteId: null,
          consumerUserId: data.consumerUserId,
          origenOnline: true,
          fechaHora: data.fechaHora,
          duracionMin: data.duracionMin,
          estado: "PENDIENTE",
          canalOrigen: "WEB",
          motivo: data.motivo ?? null,
          createdById: data.consumerUserId,
        },
      })
    })
  }

  async getCitaById(citaId: string): Promise<CitaRaw | null> {
    return db.cita.findUnique({ where: { id: citaId } })
  }

  async cancelarCitaOnline(citaId: string, consumerUserId: string): Promise<CitaRaw> {
    return db.cita.update({
      where: { id: citaId, consumerUserId },
      data: { estado: "CANCELADA_CLIENTE" },
    })
  }

  async listarMisCitas(consumerUserId: string, params: MisCitasParams): Promise<{ data: CitaRaw[]; total: number }> {
    const take = Math.min(100, Math.max(1, params.take ?? 20))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { consumerUserId, origenOnline: true }
    if (params.estado) where.estado = params.estado

    const [data, total] = await Promise.all([
      db.cita.findMany({
        where,
        skip,
        take,
        orderBy: { fechaHora: params.order ?? "desc" },
        include: {
          consultorio: { include: { tenant: { select: { name: true, slug: true } } } },
          medico: { select: { especialidad: true, member: { select: { user: { select: { name: true } } } } } },
          servicio: { select: { nombre: true } },
        },
      }),
      db.cita.count({ where }),
    ])
    return { data, total }
  }

  async confirmarCitaOnline(citaId: string, consultorioId: string): Promise<CitaRaw> {
    return db.cita.update({ where: { id: citaId, consultorioId }, data: { estado: "CONFIRMADA" } })
  }

  async rechazarCitaOnline(citaId: string, consultorioId: string, motivo?: string): Promise<CitaRaw> {
    return db.cita.update({
      where: { id: citaId, consultorioId },
      data: { estado: "RECHAZADA", ...(motivo ? { notas: motivo } : {}) },
    })
  }

  async listarCitasOnline(consultorioId: string, params: CitasOnlineParams): Promise<{ data: CitaRaw[]; total: number }> {
    const take = Math.min(100, Math.max(1, params.take ?? 20))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { consultorioId, origenOnline: true }
    if (params.estado) where.estado = params.estado

    const [data, total] = await Promise.all([
      db.cita.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      db.cita.count({ where }),
    ])
    return { data, total }
  }
}
