import type {
  ITiendaRepository,
  ActivarTiendaResultDTO,
  ConfiguracionDTO,
  ActualizarConfiguracionDTO,
  PerfilPublicoDTO,
  DirectorioQueryDTO,
  DirectorioResultDTO,
  DirectorioItemDTO,
  AgregarDestacadoDTO,
  DestacadoItemDTO,
} from "../domain/ports/ITiendaRepository.js"
import {
  ConfiguracionNoEncontradaError,
  ProductoDestacadoLimiteError,
  ProductoNoVisibleParaDestacadoError,
  ProductoDestacadoYaExisteError,
  TiendaNoEncontradaError,
} from "../domain/tienda.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs, paginate } from "../../../core/query-params.js"

const MAX_DESTACADOS = 20

// Fórmula Haversine simplificada — distancia en km entre dos puntos geográficos
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export class TiendaPrismaRepository implements ITiendaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async activar(tenantId: string, createdById?: string): Promise<ActivarTiendaResultDTO> {
    await this.db.tenant.update({ where: { id: tenantId }, data: { esTienda: true } })
    let tienda = await this.db.tienda.findUnique({ where: { tenantId } })
    if (!tienda) {
      tienda = await this.db.tienda.create({ data: { tenantId, createdById } })
      await this.db.configuracion.create({ data: { tiendaId: tienda.id } })
    }
    return { esTienda: true, tiendaId: tienda.id }
  }

  async desactivar(tenantId: string): Promise<void> {
    await this.db.tenant.update({ where: { id: tenantId }, data: { esTienda: false } })
  }

  async obtenerConfiguracion(tenantId: string): Promise<ConfiguracionDTO> {
    const tienda = await this.db.tienda.findUnique({ where: { tenantId }, select: { id: true } })
    if (!tienda) throw new ConfiguracionNoEncontradaError()
    const config = await this.db.configuracion.findUnique({ where: { tiendaId: tienda.id } })
    if (!config) throw new ConfiguracionNoEncontradaError()
    return {
      id: config.id,
      tipoDespliegueVentas: config.tipoDespliegueVentas,
      tema: config.tema,
      tipoLineado: config.tipoLineado,
      tipoDeTienda: config.tipoDeTienda,
    }
  }

  async actualizarConfiguracion(
    tenantId: string,
    dto: ActualizarConfiguracionDTO,
    updatedById?: string,
  ): Promise<ConfiguracionDTO> {
    const tienda = await this.db.tienda.findUnique({ where: { tenantId }, select: { id: true } })
    if (!tienda) throw new ConfiguracionNoEncontradaError()
    const config = await this.db.configuracion.update({
      where: { tiendaId: tienda.id },
      data: { ...dto, updatedById },
    })
    return {
      id: config.id,
      tipoDespliegueVentas: config.tipoDespliegueVentas,
      tema: config.tema,
      tipoLineado: config.tipoLineado,
      tipoDeTienda: config.tipoDeTienda,
    }
  }

  async obtenerPerfilPublico(slug: string): Promise<PerfilPublicoDTO | null> {
    const tenant = await this.db.tenant.findFirst({
      where: { slug, esTienda: true },
      include: {
        tienda: {
          include: {
            configuracion: true,
            productosDestacados: {
              orderBy: { orden: "asc" },
              include: { producto: { select: { id: true, nombre: true, precio: true, imagenUrl: true } } },
            },
            valoracionesTienda: { select: { puntuacion: true }, where: { estado: "ACTIVO" } },
            comentariosTienda: { select: { id: true }, where: { estado: "ACTIVO" } },
            seguidoresTienda: { select: { id: true } },
          },
        },
        localizaciones: { select: { latitud: true, longitud: true, direccion: true, ciudad: true, barrio: true } },
        propietarios: { where: { estado: "ACTIVO" }, select: { nombres: true, imagenUrl: true } },
        equipoDeTrabajo: { where: { estado: "ACTIVO" }, orderBy: { orden: "asc" }, select: { nombres: true, cargo: true, imagenUrl: true } },
        imagenes: { where: { estado: "ACTIVO" }, orderBy: { orden: "asc" }, select: { imagenUrl: true, descripcion: true, orden: true } },
        actividadesEconomicas: { select: { nombre: true } },
      },
    })
    if (!tenant?.tienda) return null

    const vals = tenant.tienda.valoracionesTienda as Array<{ puntuacion: number }>
    const promedio = vals.length > 0 ? vals.reduce((s: number, v: { puntuacion: number }) => s + v.puntuacion, 0) / vals.length : 0

    return {
      tiendaId: tenant.tienda.id,
      tenantSlug: tenant.slug,
      nombre: tenant.name,
      descripcion: tenant.descripcion,
      logoUrl: tenant.logo,
      imagenes: tenant.imagenes.map((i: { imagenUrl: string; descripcion: string; orden: number }) => ({ url: i.imagenUrl, descripcion: i.descripcion, orden: i.orden })),
      propietarios: tenant.propietarios,
      equipoDeTrabajo: tenant.equipoDeTrabajo,
      localizaciones: tenant.localizaciones,
      actividadesEconomicas: tenant.actividadesEconomicas.map((a: { nombre: string }) => a.nombre),
      configuracion: tenant.tienda.configuracion
        ? { tema: tenant.tienda.configuracion.tema, tipoLineado: tenant.tienda.configuracion.tipoLineado }
        : null,
      productosDestacados: tenant.tienda.productosDestacados.map((d: {
        productoId: string
        orden: number
        producto: { id: string; nombre: string; precio: unknown; imagenUrl: string | null }
      }) => ({
        productoId: d.productoId,
        nombre: d.producto.nombre,
        precio: Number(d.producto.precio),
        imagenUrl: d.producto.imagenUrl,
        orden: d.orden,
      })),
      metricas: {
        puntuacionPromedio: Math.round(promedio * 10) / 10,
        totalValoraciones: vals.length,
        totalSeguidores: tenant.tienda.seguidoresTienda.length,
        totalComentarios: tenant.tienda.comentariosTienda.length,
      },
    }
  }

  async listarDirectorio(query: DirectorioQueryDTO): Promise<DirectorioResultDTO> {
    const { lat, lng, actividadEconomicaId, categoriaId, busqueda, ordenarPor = "createdAt", orden = "desc" } = query
    const page = Math.max(1, query.page ?? 1)
    const limit = Math.min(100, Math.max(1, query.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { esTienda: true }
    if (busqueda) where.OR = [{ name: { contains: busqueda, mode: "insensitive" } }, { descripcion: { contains: busqueda, mode: "insensitive" } }]
    if (actividadEconomicaId) where.actividadesEconomicas = { some: { id: actividadEconomicaId } }
    if (categoriaId) where.categorias = { some: { id: categoriaId } }

    const [tenants, total] = await Promise.all([
      this.db.tenant.findMany({
        where,
        include: {
          localizaciones: { select: { latitud: true, longitud: true, ciudad: true, barrio: true }, take: 1 },
          actividadesEconomicas: { select: { nombre: true } },
          categorias: { select: { nombre: true } },
          tienda: {
            select: {
              id: true,
              valoracionesTienda: { select: { puntuacion: true }, where: { estado: "ACTIVO" } },
              seguidoresTienda: { select: { id: true } },
            },
          },
        },
        skip,
        take: limit,
      }),
      this.db.tenant.count({ where }),
    ])

    type TenantRow = {
      tienda: { id: string; valoracionesTienda: Array<{ puntuacion: number }>; seguidoresTienda: Array<{ id: string }> } | null
      slug: string
      name: string
      descripcion: string
      logo: string | null
      localizaciones: Array<{ latitud: number; longitud: number; ciudad: string; barrio: string | null }>
      actividadesEconomicas: Array<{ nombre: string }>
      categorias: Array<{ nombre: string }>
    }

    let items: DirectorioItemDTO[] = tenants.filter((t: TenantRow) => t.tienda).map((t: TenantRow) => {
      const vals = t.tienda!.valoracionesTienda
      const promedio = vals.length > 0 ? vals.reduce((s, v) => s + v.puntuacion, 0) / vals.length : 0
      const loc = t.localizaciones[0] ?? null
      const distanciaKm = lat != null && lng != null && loc ? haversineKm(lat, lng, loc.latitud, loc.longitud) : null
      return {
        tiendaId: t.tienda!.id,
        tenantSlug: t.slug,
        nombre: t.name,
        descripcion: t.descripcion,
        logoUrl: t.logo,
        actividadesEconomicas: t.actividadesEconomicas.map((a) => a.nombre),
        categorias: t.categorias.map((c) => c.nombre),
        puntuacionPromedio: Math.round(promedio * 10) / 10,
        totalValoraciones: vals.length,
        totalSeguidores: t.tienda!.seguidoresTienda.length,
        distanciaKm,
        localizacion: loc ? { latitud: loc.latitud, longitud: loc.longitud, ciudad: loc.ciudad, barrio: loc.barrio } : null,
      }
    })

    if (lat != null && lng != null && ordenarPor === "distancia") {
      items = items.sort((a, b) => (a.distanciaKm ?? 999) - (b.distanciaKm ?? 999))
      if (orden === "desc") items.reverse()
    } else if (ordenarPor === "puntuacion") {
      items = items.sort((a, b) => (orden === "asc" ? a.puntuacionPromedio - b.puntuacionPromedio : b.puntuacionPromedio - a.puntuacionPromedio))
    } else if (ordenarPor === "seguidores") {
      items = items.sort((a, b) => (orden === "asc" ? a.totalSeguidores - b.totalSeguidores : b.totalSeguidores - a.totalSeguidores))
    }

    const totalPaginas = Math.ceil(total / limit)
    return { data: items, total, page, limit, totalPaginas, hayPaginaSiguiente: page < totalPaginas, hayPaginaAnterior: page > 1 }
  }

  async agregarDestacado(dto: AgregarDestacadoDTO): Promise<DestacadoItemDTO> {
    const tienda = await this.db.tienda.findUnique({
      where: { tenantId: dto.tenantId },
      include: { productosDestacados: { select: { id: true } } },
    })
    if (!tienda) throw new TiendaNoEncontradaError()
    if (tienda.productosDestacados.length >= MAX_DESTACADOS) throw new ProductoDestacadoLimiteError()

    const producto = await this.db.producto.findFirst({
      where: { id: dto.productoId, tenantId: dto.tenantId, estado: "ACTIVO" },
      select: { id: true, nombre: true, imagenUrl: true },
    })
    if (!producto) throw new ProductoNoVisibleParaDestacadoError(dto.productoId)

    const existente = await this.db.productoDestacado.findUnique({
      where: { tiendaId_productoId: { tiendaId: tienda.id, productoId: dto.productoId } },
    })
    if (existente) throw new ProductoDestacadoYaExisteError(dto.productoId)

    const destacado = await this.db.productoDestacado.create({
      data: { tiendaId: tienda.id, productoId: dto.productoId, orden: dto.orden ?? 0, createdById: dto.createdById },
    })
    return { id: destacado.id, productoId: dto.productoId, nombre: producto.nombre, imagenUrl: producto.imagenUrl, orden: destacado.orden }
  }

  async quitarDestacado(tenantId: string, productoId: string): Promise<void> {
    const tienda = await this.db.tienda.findUnique({ where: { tenantId }, select: { id: true } })
    if (!tienda) throw new TiendaNoEncontradaError()
    await this.db.productoDestacado.deleteMany({ where: { tiendaId: tienda.id, productoId } })
  }

  async reordenarDestacados(tenantId: string, orden: string[]): Promise<void> {
    const tienda = await this.db.tienda.findUnique({ where: { tenantId }, select: { id: true } })
    if (!tienda) throw new TiendaNoEncontradaError()
    await Promise.all(
      orden.map((productoId, idx) =>
        this.db.productoDestacado.updateMany({ where: { tiendaId: tienda.id, productoId }, data: { orden: idx } }),
      ),
    )
  }

  async listarDestacados(tenantId: string): Promise<DestacadoItemDTO[]> {
    const tienda = await this.db.tienda.findUnique({ where: { tenantId }, select: { id: true } })
    if (!tienda) return []
    const items = await this.db.productoDestacado.findMany({
      where: { tiendaId: tienda.id },
      orderBy: { orden: "asc" },
      include: { producto: { select: { nombre: true, imagenUrl: true } } },
    })
    return items.map((d: { id: string; productoId: string; orden: number; producto: { nombre: string; imagenUrl: string | null } }) => ({
      id: d.id,
      productoId: d.productoId,
      nombre: d.producto.nombre,
      imagenUrl: d.producto.imagenUrl,
      orden: d.orden,
    }))
  }

  async listarCatalogoPublico(slug: string, params: QueryParams): Promise<{ data: unknown[]; total: number }> {
    const tenant = await this.db.tenant.findFirst({ where: { slug, esTienda: true }, select: { id: true } })
    if (!tenant) return { data: [], total: 0 }
    const prismaArgs = toPrismaArgs(params, ["nombre"])
    const where = { ...prismaArgs.where, tenantId: tenant.id, estado: "ACTIVO" }
    const [data, total] = await Promise.all([
      this.db.producto.findMany({ ...prismaArgs, where, select: { id: true, nombre: true, descripcion: true, precio: true, imagenUrl: true, estado: true } }),
      this.db.producto.count({ where }),
    ])
    const result = paginate(data, total, params)
    return { data: result.data, total: result.meta.total }
  }
}
