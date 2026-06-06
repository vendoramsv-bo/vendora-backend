import type {
  IRestaurantePublicoRepository,
  ActivarRestauranteResultDTO,
  ConfiguracionPublicaDTO,
  ActualizarConfiguracionPublicaDTO,
  PerfilPublicoRestauranteDTO,
  DirectorioRestauranteQueryDTO,
  DirectorioRestauranteResultDTO,
  MenuPublicoQueryDTO,
  ReservaPublicaCreateDTO,
  ReservaPublicaDTO,
  MisReservasQueryDTO,
} from "../domain/ports/IRestaurantePublicoRepository.js"
import {
  PerfilNoEncontradoError,
  ReservaNoEncontradaError,
  ReservaNoModificableError,
} from "../domain/restaurante-publico.errors.js"
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

function generarCodigoReserva(fecha: Date, contador: number): string {
  const anio = fecha.getFullYear()
  const num = String(contador).padStart(4, "0")
  return `RES-${anio}-${num}`
}

export class RestaurantePublicoPrismaRepository implements IRestaurantePublicoRepository {

  // ─── US1: Activación y configuración ─────────────────────────────────────────

  async activar(tenantId: string, createdById?: string): Promise<ActivarRestauranteResultDTO> {
    await db.tenant.update({ where: { id: tenantId }, data: { esRestaurante: true } })
    let restaurante = await db.restaurante.findUnique({ where: { tenantId } })
    if (!restaurante) {
      restaurante = await db.restaurante.create({ data: { tenantId, createdById } })
    }
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } })
    return { esRestaurante: true, slug: tenant.slug }
  }

  async desactivar(tenantId: string): Promise<void> {
    await db.tenant.update({ where: { id: tenantId }, data: { esRestaurante: false } })
  }

  async obtenerConfiguracion(tenantId: string): Promise<ConfiguracionPublicaDTO> {
    const restaurante = await db.restaurante.findUnique({
      where: { tenantId },
      select: {
        id: true,
        especialidad: true,
        tipoServicio: true,
        capacidadMesas: true,
        capacidadComensales: true,
        duracionPromedioMin: true,
        horarios: true,
        fotos: true,
        contactoPublico: true,
      },
    })
    if (!restaurante) throw new PerfilNoEncontradoError()
    return {
      restauranteId: restaurante.id,
      especialidad: restaurante.especialidad,
      tipoServicio: restaurante.tipoServicio,
      capacidadMesas: restaurante.capacidadMesas,
      capacidadComensales: restaurante.capacidadComensales,
      duracionPromedioMin: restaurante.duracionPromedioMin,
      horarios: restaurante.horarios,
      fotos: restaurante.fotos ?? [],
      contactoPublico: restaurante.contactoPublico,
    }
  }

  async actualizarConfiguracion(tenantId: string, datos: ActualizarConfiguracionPublicaDTO, updatedById?: string): Promise<ConfiguracionPublicaDTO> {
    const restaurante = await db.restaurante.update({
      where: { tenantId },
      data: { ...datos, updatedById },
      select: {
        id: true,
        especialidad: true,
        tipoServicio: true,
        capacidadMesas: true,
        capacidadComensales: true,
        duracionPromedioMin: true,
        horarios: true,
        fotos: true,
        contactoPublico: true,
      },
    })
    return {
      restauranteId: restaurante.id,
      especialidad: restaurante.especialidad,
      tipoServicio: restaurante.tipoServicio,
      capacidadMesas: restaurante.capacidadMesas,
      capacidadComensales: restaurante.capacidadComensales,
      duracionPromedioMin: restaurante.duracionPromedioMin,
      horarios: restaurante.horarios,
      fotos: restaurante.fotos ?? [],
      contactoPublico: restaurante.contactoPublico,
    }
  }

  async obtenerPerfilPublico(slug: string): Promise<PerfilPublicoRestauranteDTO | null> {
    const tenant = await db.tenant.findFirst({
      where: { slug, esRestaurante: true },
      include: {
        restaurante: {
          include: {
            valoraciones: { where: { estado: "ACTIVO" }, select: { puntuacion: true } },
            seguidores: { select: { id: true } },
          },
        },
        localizaciones: { select: { latitud: true, longitud: true, direccion: true, ciudad: true } },
        propietarios: { where: { estado: "ACTIVO" }, select: { nombres: true, imagenUrl: true } },
        equipoDeTrabajo: { where: { estado: "ACTIVO" }, orderBy: { orden: "asc" }, select: { nombres: true, cargo: true, imagenUrl: true } },
      },
    })
    if (!tenant?.restaurante) return null

    const vals = tenant.restaurante.valoraciones as Array<{ puntuacion: number }>
    const promedio = vals.length > 0 ? Math.round((vals.reduce((s: number, v: { puntuacion: number }) => s + v.puntuacion, 0) / vals.length) * 10) / 10 : null

    return {
      slug: tenant.slug,
      nombre: tenant.name,
      descripcion: tenant.descripcion,
      logoUrl: tenant.logo,
      fotos: tenant.restaurante.fotos ?? [],
      tipoServicio: tenant.restaurante.tipoServicio,
      especialidad: tenant.restaurante.especialidad,
      capacidadMesas: tenant.restaurante.capacidadMesas,
      capacidadComensales: tenant.restaurante.capacidadComensales,
      duracionPromedioMin: tenant.restaurante.duracionPromedioMin,
      horarios: tenant.restaurante.horarios,
      contactoPublico: tenant.restaurante.contactoPublico,
      localizaciones: tenant.localizaciones.map((l: { latitud: number; longitud: number; direccion: string; ciudad: string }) => ({
        direccion: l.direccion,
        ciudad: l.ciudad,
        lat: l.latitud,
        lng: l.longitud,
      })),
      propietariosVisibles: tenant.propietarios,
      equipoPublico: tenant.equipoDeTrabajo,
      metricas: {
        puntuacionPromedio: promedio,
        totalValoraciones: vals.length,
        totalSeguidores: tenant.restaurante.seguidores.length,
      },
    }
  }

  // ─── US2: Directorio ──────────────────────────────────────────────────────────

  async listarDirectorio(params: DirectorioRestauranteQueryDTO): Promise<DirectorioRestauranteResultDTO> {
    const { lat, lng, tipoServicio, especialidad, search, orderBy = "puntuacion", order = "desc" } = params
    const take = Math.min(100, Math.max(1, params.take ?? 20))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take

    const where: Record<string, unknown> = { esRestaurante: true }
    if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { descripcion: { contains: search, mode: "insensitive" } }]

    const restauranteWhere: Record<string, unknown> = {}
    if (tipoServicio) restauranteWhere.tipoServicio = tipoServicio
    if (especialidad) restauranteWhere.especialidad = { contains: especialidad, mode: "insensitive" }
    if (Object.keys(restauranteWhere).length > 0) where.restaurante = { is: restauranteWhere }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        include: {
          restaurante: {
            select: {
              id: true,
              tipoServicio: true,
              especialidad: true,
              valoraciones: { where: { estado: "ACTIVO" }, select: { puntuacion: true } },
              seguidores: { select: { id: true } },
            },
          },
          localizaciones: { select: { latitud: true, longitud: true, ciudad: true }, take: 1 },
        },
        skip,
        take,
      }),
      db.tenant.count({ where }),
    ])

    type TenantRow = {
      id: string
      slug: string
      name: string
      descripcion: string
      logo: string | null
      restaurante: {
        id: string
        tipoServicio: string | null
        especialidad: string | null
        valoraciones: Array<{ puntuacion: number }>
        seguidores: Array<{ id: string }>
      } | null
      localizaciones: Array<{ latitud: number; longitud: number; ciudad: string }>
    }

    let items = (tenants as TenantRow[]).filter((t) => t.restaurante).map((t) => {
      const vals = t.restaurante!.valoraciones
      const promedio = vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v.puntuacion, 0) / vals.length) * 10) / 10 : null
      const loc = t.localizaciones[0] ?? null
      const distanciaKm = lat != null && lng != null && loc ? haversineKm(lat, lng, loc.latitud, loc.longitud) : null
      return {
        slug: t.slug,
        nombre: t.name,
        descripcion: t.descripcion,
        logoUrl: t.logo,
        tipoServicio: t.restaurante!.tipoServicio,
        especialidad: t.restaurante!.especialidad,
        puntuacionPromedio: promedio,
        totalValoraciones: vals.length,
        totalSeguidores: t.restaurante!.seguidores.length,
        distanciaKm,
        ciudad: loc?.ciudad ?? null,
      }
    })

    if (lat != null && lng != null && orderBy === "cercania") {
      items = items.sort((a, b) => (a.distanciaKm ?? 999) - (b.distanciaKm ?? 999))
      if (order === "desc") items.reverse()
    } else if (orderBy === "puntuacion") {
      items = items.sort((a, b) => order === "asc" ? (a.puntuacionPromedio ?? 0) - (b.puntuacionPromedio ?? 0) : (b.puntuacionPromedio ?? 0) - (a.puntuacionPromedio ?? 0))
    } else if (orderBy === "seguidores") {
      items = items.sort((a, b) => order === "asc" ? a.totalSeguidores - b.totalSeguidores : b.totalSeguidores - a.totalSeguidores)
    }

    const totalPaginas = Math.ceil(total / take)
    return {
      data: items,
      total,
      page,
      take,
      totalPaginas,
      hayPaginaSiguiente: page < totalPaginas,
      hayPaginaAnterior: page > 1,
    }
  }

  // ─── US3: Menú público ────────────────────────────────────────────────────────

  async listarMenusPublicos(query: MenuPublicoQueryDTO): Promise<{ data: unknown[]; total: number; page: number; take: number; totalPaginas: number; hayPaginaSiguiente: boolean; hayPaginaAnterior: boolean }> {
    const { restauranteId, tiempoComida, fecha } = query
    const take = Math.min(100, Math.max(1, query.take ?? 10))
    const page = Math.max(1, query.page ?? 1)
    const skip = (page - 1) * take

    const fechaRef = fecha ? new Date(fecha) : new Date()
    fechaRef.setHours(0, 0, 0, 0)
    const fechaFin = new Date(fechaRef)
    fechaFin.setHours(23, 59, 59, 999)

    const where: Record<string, unknown> = {
      restauranteId,
      estado: "PUBLICADO",
      fechaInicio: { lte: fechaFin },
      fechaFin: { gte: fechaRef },
    }

    const [menus, total] = await Promise.all([
      db.menu.findMany({
        where,
        take,
        skip,
        orderBy: { fechaInicio: "desc" },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          imagenPortada: true,
          fechaInicio: true,
          fechaFin: true,
          items: {
            where: tiempoComida ? { tiempoComida: { nombre: { equals: tiempoComida, mode: "insensitive" } } } : {},
            select: {
              id: true,
              nombreSnapshot: true,
              descripcionSnapshot: true,
              imagenSnapshot: true,
              precio: true,
              esEspecial: true,
              destacado: true,
              disponible: true,
              tiempoComida: { select: { nombre: true } },
            },
            orderBy: { orden: "asc" },
          },
        },
      }),
      db.menu.count({ where }),
    ])

    const data = menus.map((m: {
      id: string
      nombre: string
      descripcion: string | null
      imagenPortada: string | null
      fechaInicio: Date
      fechaFin: Date
      items: Array<{
        id: string
        nombreSnapshot: string
        descripcionSnapshot: string | null
        imagenSnapshot: string | null
        precio: unknown
        esEspecial: boolean
        destacado: boolean
        disponible: boolean
        tiempoComida: { nombre: string }
      }>
    }) => ({
      id: m.id,
      nombre: m.nombre,
      descripcion: m.descripcion,
      imagenPortada: m.imagenPortada,
      fechaInicio: m.fechaInicio.toISOString(),
      fechaFin: m.fechaFin.toISOString(),
      items: m.items.map((i) => ({
        id: i.id,
        nombreSnapshot: i.nombreSnapshot,
        descripcionSnapshot: i.descripcionSnapshot,
        imagenSnapshot: i.imagenSnapshot,
        precio: Number(i.precio),
        esEspecial: i.esEspecial,
        destacado: i.destacado,
        disponible: i.disponible,
        tiempoComida: i.tiempoComida.nombre,
      })),
    }))

    const totalPaginas = Math.ceil(total / take)
    return {
      data,
      total,
      page,
      take,
      totalPaginas,
      hayPaginaSiguiente: page < totalPaginas,
      hayPaginaAnterior: page > 1,
    }
  }

  // ─── US4: Reservas públicas ───────────────────────────────────────────────────

  async crearReservaPublica(datos: ReservaPublicaCreateDTO): Promise<{ id: string; codigo: string; fechaLlegada: Date; numeroComensales: number; estado: string }> {
    const restaurante = await db.restaurante.findUnique({ where: { tenantId: datos.tenantId }, select: { id: true } })
    if (!restaurante) throw new PerfilNoEncontradoError()

    const hoy = new Date()
    const contadorBase = await db.reserva.count({ where: { restauranteId: restaurante.id } })
    let codigo = generarCodigoReserva(hoy, contadorBase + 1)
    let intento = 0
    while (await db.reserva.findFirst({ where: { restauranteId: restaurante.id, codigo } })) {
      intento++
      codigo = generarCodigoReserva(hoy, contadorBase + 1 + intento)
    }

    const reserva = await db.reserva.create({
      data: {
        restauranteId: restaurante.id,
        codigo,
        clienteId: null,
        clienteNombre: datos.userId,
        fechaLlegada: datos.fechaLlegada,
        numeroComensales: datos.numeroComensales,
        observaciones: datos.observaciones ?? null,
        canalOrigen: "WEB",
        estado: "PENDIENTE",
        createdById: datos.userId,
      },
    })

    return {
      id: reserva.id,
      codigo: reserva.codigo,
      fechaLlegada: reserva.fechaLlegada,
      numeroComensales: reserva.numeroComensales,
      estado: reserva.estado,
    }
  }

  async listarMisReservas(query: MisReservasQueryDTO): Promise<{ data: ReservaPublicaDTO[]; total: number; page: number; take: number; totalPaginas: number; hayPaginaSiguiente: boolean; hayPaginaAnterior: boolean }> {
    const take = Math.min(100, Math.max(1, query.take ?? 20))
    const page = Math.max(1, query.page ?? 1)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { createdById: query.userId }
    if (query.estado) where.estado = query.estado

    const [reservas, total] = await Promise.all([
      db.reserva.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          restaurante: {
            include: { tenant: { select: { name: true, slug: true, logo: true } } },
          },
        },
      }),
      db.reserva.count({ where }),
    ])

    const data = reservas.map((r: {
      id: string
      codigo: string
      fechaLlegada: Date
      numeroComensales: number
      estado: string
      observaciones: string | null
      restaurante: { tenant: { name: string; slug: string; logo: string | null } }
    }) => ({
      id: r.id,
      codigo: r.codigo,
      fechaLlegada: r.fechaLlegada,
      numeroComensales: r.numeroComensales,
      estado: r.estado,
      observaciones: r.observaciones,
      restaurante: {
        nombre: r.restaurante.tenant.name,
        slug: r.restaurante.tenant.slug,
        logoUrl: r.restaurante.tenant.logo,
      },
    }))

    const totalPaginas = Math.ceil(total / take)
    return {
      data,
      total,
      page,
      take,
      totalPaginas,
      hayPaginaSiguiente: page < totalPaginas,
      hayPaginaAnterior: page > 1,
    }
  }

  async cancelarReservaPublica(reservaId: string, userId: string): Promise<{ id: string; estado: string }> {
    const reserva = await db.reserva.findFirst({
      where: { id: reservaId, createdById: userId },
      select: { id: true, estado: true },
    })
    if (!reserva) throw new ReservaNoEncontradaError(reservaId)
    if (reserva.estado !== "PENDIENTE") throw new ReservaNoModificableError(reserva.estado)

    const actualizada = await db.reserva.update({
      where: { id: reservaId },
      data: { estado: "CANCELADA_CLIENTE" },
      select: { id: true, estado: true },
    })
    return { id: actualizada.id, estado: actualizada.estado }
  }
}
