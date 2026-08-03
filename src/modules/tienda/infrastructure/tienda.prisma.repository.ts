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
  CategoriaPublicaDTO,
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

/** Tope del carrusel de favoritos: mas largo que esto es una lista disfrazada. */
const MAX_FAVORITOS_COMUNIDAD = 12

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
      // Un comercio solo es publico con el wizard de creacion terminado (FR-048).
      where: { slug, esTienda: true, estado: "FINALIZADO" },
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
        actividadesEconomicas: { include: { claActividadEconomica: { select: { nombre: true } } } },
      },
    })
    if (!tenant?.tienda) return null

    const vals = tenant.tienda.valoracionesTienda as Array<{ puntuacion: number }>
    const promedio = vals.length > 0 ? vals.reduce((s: number, v: { puntuacion: number }) => s + v.puntuacion, 0) / vals.length : 0

    // Los destacados llevan el mismo agregado de valoracion que el catalogo, para
    // que la tarjeta de producto sea UNA sola en toda la vitrina (spec 019 FR-020).
    const destacadosConValoracion = (await this.conValoraciones(
      tenant.tienda.productosDestacados.map((d: {
        productoId: string
        orden: number
        producto: { id: string; nombre: string; precio: unknown; imagenUrl: string | null }
      }) => ({
        id: d.producto.id,
        productoId: d.productoId,
        nombre: d.producto.nombre,
        precio: Number(d.producto.precio),
        imagenUrl: d.producto.imagenUrl,
        orden: d.orden,
      })),
    )) as PerfilPublicoDTO["productosDestacados"]

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
      actividadesEconomicas: tenant.actividadesEconomicas.map((a: { claActividadEconomica: { nombre: string } | null }) => a.claActividadEconomica?.nombre ?? ""),
      configuracion: tenant.tienda.configuracion
        ? { tema: tenant.tienda.configuracion.tema, tipoLineado: tenant.tienda.configuracion.tipoLineado }
        : null,
      productosDestacados: destacadosConValoracion,
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
    const take = Math.min(100, Math.max(1, query.take ?? query.limit ?? 20))
    const skip = (page - 1) * take

    // Solo comercios con la creacion completa entran al directorio (FR-048).
    const where: Record<string, unknown> = { esTienda: true, estado: "FINALIZADO" }
    if (busqueda) where.OR = [{ name: { contains: busqueda, mode: "insensitive" } }, { descripcion: { contains: busqueda, mode: "insensitive" } }]
    if (actividadEconomicaId) where.actividadesEconomicas = { some: { id: actividadEconomicaId } }
    if (categoriaId) where.categorias = { some: { id: categoriaId } }

    const [tenants, total] = await Promise.all([
      this.db.tenant.findMany({
        where,
        include: {
          localizaciones: { select: { latitud: true, longitud: true, ciudad: true, barrio: true }, take: 1 },
          actividadesEconomicas: { include: { claActividadEconomica: { select: { nombre: true } } } },
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
        take: take,
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
      actividadesEconomicas: Array<{ claActividadEconomica: { nombre: string } | null }>
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
        actividadesEconomicas: t.actividadesEconomicas.map((a) => a.claActividadEconomica?.nombre ?? ""),
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

    const totalPaginas = Math.ceil(total / take)
    return { data: items, total, page, take, totalPaginas, hayPaginaSiguiente: page < totalPaginas, hayPaginaAnterior: page > 1 }
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

  async listarCatalogoPublico(slug: string, params: QueryParams, categoriaId?: string): Promise<{ data: unknown[]; total: number }> {
    const tenant = await this.db.tenant.findFirst({ where: { slug, esTienda: true, estado: "FINALIZADO" }, select: { id: true } })
    if (!tenant) return { data: [], total: 0 }
    const prismaArgs = toPrismaArgs(params, ["nombre"])
    // El filtro por categoria se combina con la busqueda y el orden, no los anula
    // (spec 019 FR-004).
    const where = {
      ...prismaArgs.where,
      tenantId: tenant.id,
      estado: "ACTIVO",
      ...(categoriaId ? { categoriaId } : {}),
    }
    const [data, total] = await Promise.all([
      this.db.producto.findMany({ ...prismaArgs, where, select: { id: true, nombre: true, descripcion: true, precio: true, imagenUrl: true, estado: true, categoriaId: true } }),
      this.db.producto.count({ where }),
    ])
    const result = paginate(data as { id: string }[], total, params)
    return { data: await this.conValoraciones(result.data), total: result.total }
  }

  /**
   * Agrega a cada producto el promedio de valoraciones VISIBLES y su cantidad
   * (spec 019 FR-020).
   *
   * Va acá, embebido en la respuesta que ya se está armando, y no en un endpoint
   * por producto: una grilla de doce tarjetas dispararía doce peticiones justo en
   * el camino del LCP (research R-03). Una sola consulta agregada para toda la
   * página.
   */
  private async conValoraciones<T extends { id: string }>(productos: T[]): Promise<unknown[]> {
    if (productos.length === 0) return productos

    const grupos = await this.db.productoValoracion.groupBy({
      by: ["productoId"],
      // Una valoración oculta no cuenta, igual que en el promedio del comercio.
      where: { productoId: { in: productos.map((p) => p.id) }, estado: "ACTIVO" },
      _avg: { puntuacion: true },
      _count: { _all: true },
    })

    const porProducto = new Map<string, { promedio: number; total: number }>(
      grupos.map((g: { productoId: string; _avg: { puntuacion: number | null }; _count: { _all: number } }) => [
        g.productoId,
        { promedio: g._avg.puntuacion ?? 0, total: g._count._all },
      ]),
    )

    return productos.map((producto) => {
      const agregado = porProducto.get(producto.id)
      return {
        ...producto,
        // Sin valoraciones va 0, y la tarjeta muestra "Sin valoraciones" — nunca
        // cinco estrellas vacías, que se leen como "calificado mal" (FR-021).
        puntuacionPromedio: agregado ? Math.round(agregado.promedio * 10) / 10 : 0,
        totalValoraciones: agregado?.total ?? 0,
      }
    })
  }

  /**
   * Categorias que el comercio realmente usa en su catalogo publico
   * (spec 019 FR-001).
   *
   * Se derivan de los productos, no de la tabla de categorias: una categoria sin
   * productos ACTIVO no le sirve de nada a quien esta navegando la vitrina.
   * Se aplanan a un nivel — `padreId`/`nivel` existen en el modelo pero una barra
   * horizontal no representa jerarquia sin volverse un menu (research R-01).
   */
  async listarCategoriasPublicas(slug: string): Promise<CategoriaPublicaDTO[]> {
    const tenant = await this.db.tenant.findFirst({ where: { slug, esTienda: true, estado: "FINALIZADO" }, select: { id: true } })
    if (!tenant) return []

    const grupos = await this.db.producto.groupBy({
      by: ["categoriaId"],
      where: { tenantId: tenant.id, estado: "ACTIVO" },
      _count: { _all: true },
    })
    if (grupos.length === 0) return []

    const conteoPorCategoria = new Map<string, number>(
      grupos.map((g: { categoriaId: string; _count: { _all: number } }) => [g.categoriaId, g._count._all]),
    )

    const categorias = await this.db.categoria.findMany({
      where: { id: { in: [...conteoPorCategoria.keys()] } },
      select: { id: true, nombre: true },
    })

    return categorias
      .map((c: { id: string; nombre: string }) => ({
        id: c.id,
        nombre: c.nombre,
        totalProductos: conteoPorCategoria.get(c.id) ?? 0,
      }))
      .sort((a: CategoriaPublicaDTO, b: CategoriaPublicaDTO) => a.nombre.localeCompare(b.nombre, "es"))
  }

  /**
   * Productos del comercio que mas personas guardaron como favoritos
   * (spec 019 FR-024, FR-027, FR-028).
   *
   * Se expone el CONTEO, nunca quien lo guardo: el agregado es publico, la
   * identidad no. Es la misma linea que la spec 018 traza para la autoria de los
   * aportes publicos.
   *
   * Tope de 12: un carrusel mas largo es una lista disfrazada.
   */
  async listarFavoritosComunidad(slug: string): Promise<unknown[]> {
    const tenant = await this.db.tenant.findFirst({ where: { slug, esTienda: true, estado: "FINALIZADO" }, select: { id: true } })
    if (!tenant) return []

    const grupos = await this.db.productoFavorito.groupBy({
      by: ["productoId"],
      where: { tenantId: tenant.id },
      _count: { _all: true },
      orderBy: { _count: { productoId: "desc" } },
      take: MAX_FAVORITOS_COMUNIDAD,
    })
    if (grupos.length === 0) return []

    const favoritosPorProducto = new Map<string, number>(
      grupos.map((g: { productoId: string; _count: { _all: number } }) => [g.productoId, g._count._all]),
    )

    // Un producto retirado no vuelve al carrusel aunque siga guardado (FR-028).
    const productos = await this.db.producto.findMany({
      where: { id: { in: [...favoritosPorProducto.keys()] }, tenantId: tenant.id, estado: "ACTIVO" },
      select: { id: true, nombre: true, descripcion: true, precio: true, imagenUrl: true, estado: true, categoriaId: true },
    })

    const conValoracion = await this.conValoraciones(productos)

    return (conValoracion as { id: string }[])
      .map((producto) => ({
        ...producto,
        totalFavoritos: favoritosPorProducto.get(producto.id) ?? 0,
      }))
      .sort((a, b) => b.totalFavoritos - a.totalFavoritos)
  }
}
