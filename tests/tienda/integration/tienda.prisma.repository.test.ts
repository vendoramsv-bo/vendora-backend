import { describe, it, expect, vi } from "vitest"
import { TiendaPrismaRepository } from "../../../src/modules/tienda/infrastructure/tienda.prisma.repository.js"

/**
 * Regla C1 de la vitrina publica (spec 018 — FR-048, FR-049, SC-012):
 *
 *   publicado  <=>  Tenant.esTienda === true  Y  Tenant.estado === "FINALIZADO"
 *
 * Un comercio a medio crear tiene que ser indistinguible de un slug inexistente
 * en las tres puertas publicas: perfil, catalogo y directorio.
 *
 * El repositorio recibe el cliente Prisma por constructor, asi que estos tests
 * usan un doble que responde segun el `where` recibido — sin base de datos.
 */

const SLUG = "tienda-a-medio-crear"

/** Doble de Prisma que solo devuelve el tenant si el `where` lo acepta. */
function crearDb(tenant: Record<string, unknown> | null) {
  const cumpleWhere = (where: Record<string, unknown>) => {
    if (!tenant) return false
    return Object.entries(where).every(([campo, valor]) => tenant[campo] === valor)
  }
  return {
    tenant: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        cumpleWhere(where) ? tenant : null,
      ),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        cumpleWhere(where) ? [tenant] : [],
      ),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        cumpleWhere(where) ? 1 : 0,
      ),
    },
    producto: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      groupBy: vi.fn(async () => [] as unknown[]),
    },
    categoria: {
      findMany: vi.fn(async () => [] as unknown[]),
    },
    productoValoracion: {
      groupBy: vi.fn(async () => [] as unknown[]),
    },
    productoFavorito: {
      groupBy: vi.fn(async () => [] as unknown[]),
    },
  }
}

const TENANT_PENDIENTE = {
  id: "tenant-1",
  slug: SLUG,
  esTienda: true,
  estado: "PENDIENTE",
  name: "Comercio a medio crear",
}

const TENANT_FINALIZADO = { ...TENANT_PENDIENTE, estado: "FINALIZADO" }

describe("TiendaPrismaRepository — C1: solo comercios con la creacion completa", () => {
  describe("obtenerPerfilPublico", () => {
    it("devuelve null si el tenant no llego a FINALIZADO", async () => {
      const db = crearDb(TENANT_PENDIENTE)
      const repo = new TiendaPrismaRepository(db)

      await expect(repo.obtenerPerfilPublico(SLUG)).resolves.toBeNull()
    })

    it("consulta filtrando por estado FINALIZADO y esTienda", async () => {
      const db = crearDb(TENANT_PENDIENTE)
      const repo = new TiendaPrismaRepository(db)

      await repo.obtenerPerfilPublico(SLUG)

      expect(db.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: SLUG, esTienda: true, estado: "FINALIZADO" },
        }),
      )
    })

    it("responde igual que ante un slug inexistente (SC-012)", async () => {
      const conTenantPendiente = new TiendaPrismaRepository(crearDb(TENANT_PENDIENTE))
      const sinTenant = new TiendaPrismaRepository(crearDb(null))

      const [pendiente, inexistente] = await Promise.all([
        conTenantPendiente.obtenerPerfilPublico(SLUG),
        sinTenant.obtenerPerfilPublico("slug-que-no-existe"),
      ])

      expect(pendiente).toEqual(inexistente)
    })
  })

  describe("listarCatalogoPublico", () => {
    it("devuelve el catalogo vacio si el tenant no llego a FINALIZADO", async () => {
      const db = crearDb(TENANT_PENDIENTE)
      const repo = new TiendaPrismaRepository(db)

      const resultado = await repo.listarCatalogoPublico(SLUG, { take: 12, skip: 0 })

      expect(resultado).toEqual({ data: [], total: 0 })
      // No debe llegar siquiera a consultar productos.
      expect(db.producto.findMany).not.toHaveBeenCalled()
    })

    it("consulta productos cuando el tenant esta FINALIZADO", async () => {
      const db = crearDb(TENANT_FINALIZADO)
      const repo = new TiendaPrismaRepository(db)

      await repo.listarCatalogoPublico(SLUG, { take: 12, skip: 0 })

      expect(db.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: SLUG, esTienda: true, estado: "FINALIZADO" },
        }),
      )
      expect(db.producto.findMany).toHaveBeenCalled()
    })
  })

  describe("listarDirectorio", () => {
    it("no lista comercios que no llegaron a FINALIZADO", async () => {
      const repo = new TiendaPrismaRepository(crearDb(TENANT_PENDIENTE))

      const resultado = await repo.listarDirectorio({})

      expect(resultado.data).toEqual([])
      expect(resultado.total).toBe(0)
    })

    it("arma el where con esTienda y estado FINALIZADO", async () => {
      const db = crearDb(TENANT_FINALIZADO)
      const repo = new TiendaPrismaRepository(db)

      await repo.listarDirectorio({})

      expect(db.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ esTienda: true, estado: "FINALIZADO" }),
        }),
      )
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Cambio B1 de la spec 019 — categorías del catálogo público y filtro por
// categoría.
//
// Dos reglas:
//   1. Las categorías se derivan de los PRODUCTOS, no de la tabla de categorías:
//      una categoría sin productos ACTIVO no le sirve a quien navega la vitrina.
//   2. `categoriaId` filtra el catálogo, y hasta este cambio el handler lo
//      declaraba en su schema pero la consulta lo descartaba en silencio.
// ────────────────────────────────────────────────────────────────────────────

/** Doble con productos agrupados por categoría y el catálogo de nombres. */
function crearDbConCategorias(
  tenant: Record<string, unknown> | null,
  grupos: { categoriaId: string; total: number }[],
  categorias: { id: string; nombre: string }[],
) {
  const db = crearDb(tenant)
  db.producto.groupBy = vi.fn(async () =>
    grupos.map((g) => ({ categoriaId: g.categoriaId, _count: { _all: g.total } })),
  )
  db.categoria.findMany = vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
    categorias.filter((c) => where.id.in.includes(c.id)),
  )
  return db
}

const GRUPOS = [
  { categoriaId: "cat-bebidas", total: 4 },
  { categoriaId: "cat-abarrotes", total: 9 },
]
const CATEGORIAS = [
  { id: "cat-bebidas", nombre: "Bebidas" },
  { id: "cat-abarrotes", nombre: "Abarrotes" },
]

describe("TiendaPrismaRepository — B1: categorías del catálogo público", () => {
  it("devuelve las categorías con su conteo, ordenadas alfabéticamente", async () => {
    const repo = new TiendaPrismaRepository(
      crearDbConCategorias(TENANT_FINALIZADO, GRUPOS, CATEGORIAS),
    )

    const categorias = await repo.listarCategoriasPublicas(SLUG)

    expect(categorias).toEqual([
      { id: "cat-abarrotes", nombre: "Abarrotes", totalProductos: 9 },
      { id: "cat-bebidas", nombre: "Bebidas", totalProductos: 4 },
    ])
  })

  it("solo agrupa productos ACTIVO del tenant", async () => {
    const db = crearDbConCategorias(TENANT_FINALIZADO, GRUPOS, CATEGORIAS)
    const repo = new TiendaPrismaRepository(db)

    await repo.listarCategoriasPublicas(SLUG)

    expect(db.producto.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["categoriaId"],
        where: { tenantId: "tenant-1", estado: "ACTIVO" },
      }),
    )
  })

  it("omite las categorías que no tienen ningún producto publicado", async () => {
    // El groupBy solo devuelve bebidas: abarrotes existe como categoría pero no
    // tiene productos ACTIVO, así que no debe llegar a la barra.
    const db = crearDbConCategorias(TENANT_FINALIZADO, [GRUPOS[0]], CATEGORIAS)
    const repo = new TiendaPrismaRepository(db)

    const categorias = await repo.listarCategoriasPublicas(SLUG)

    expect(categorias).toEqual([{ id: "cat-bebidas", nombre: "Bebidas", totalProductos: 4 }])
  })

  it("un tenant PENDIENTE no devuelve categorías ni consulta productos", async () => {
    const db = crearDbConCategorias(TENANT_PENDIENTE, GRUPOS, CATEGORIAS)
    const repo = new TiendaPrismaRepository(db)

    await expect(repo.listarCategoriasPublicas(SLUG)).resolves.toEqual([])
    expect(db.producto.groupBy).not.toHaveBeenCalled()
  })

  it("un comercio sin productos devuelve lista vacía sin pedir nombres", async () => {
    const db = crearDbConCategorias(TENANT_FINALIZADO, [], CATEGORIAS)
    const repo = new TiendaPrismaRepository(db)

    await expect(repo.listarCategoriasPublicas(SLUG)).resolves.toEqual([])
    expect(db.categoria.findMany).not.toHaveBeenCalled()
  })
})

describe("TiendaPrismaRepository — B1: filtro del catálogo por categoría", () => {
  const PARAMS = { take: 12, skip: 0, order: "desc" as const }

  it("agrega categoriaId al where cuando viene", async () => {
    const db = crearDb(TENANT_FINALIZADO)
    const repo = new TiendaPrismaRepository(db)

    await repo.listarCatalogoPublico(SLUG, PARAMS, "cat-bebidas")

    expect(db.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoriaId: "cat-bebidas", estado: "ACTIVO" }),
      }),
    )
  })

  it("NO agrega categoriaId cuando no viene — es la opción 'Todos'", async () => {
    const db = crearDb(TENANT_FINALIZADO)
    const repo = new TiendaPrismaRepository(db)

    await repo.listarCatalogoPublico(SLUG, PARAMS)

    const argumentos = db.producto.findMany.mock.calls[0][0] as { where: Record<string, unknown> }
    expect(argumentos.where).not.toHaveProperty("categoriaId")
  })

  it("el filtro por categoría se combina con la búsqueda, no la anula", async () => {
    const db = crearDb(TENANT_FINALIZADO)
    const repo = new TiendaPrismaRepository(db)

    await repo.listarCatalogoPublico(SLUG, { ...PARAMS, search: "leche" }, "cat-bebidas")

    expect(db.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoriaId: "cat-bebidas",
          OR: [{ nombre: { contains: "leche", mode: "insensitive" } }],
        }),
      }),
    )
  })

  it("devuelve categoriaId en cada producto para que la tarjeta lo conozca", async () => {
    const db = crearDb(TENANT_FINALIZADO)
    const repo = new TiendaPrismaRepository(db)

    await repo.listarCatalogoPublico(SLUG, PARAMS)

    expect(db.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ categoriaId: true }),
      }),
    )
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Cambio B3 de la spec 019 — el agregado de valoración viaja EMBEBIDO en el
// catálogo.
//
// La alternativa era un endpoint por producto, que en una grilla de doce
// tarjetas son doce peticiones justo en el camino del LCP. Estos tests fijan que
// sale de una sola consulta agregada y que las valoraciones ocultas no cuentan.
// ────────────────────────────────────────────────────────────────────────────

describe("TiendaPrismaRepository — B3: valoración embebida en el catálogo", () => {
  const PARAMS = { take: 12, skip: 0, order: "desc" as const }

  function crearDbConProductos(
    productos: { id: string }[],
    valoraciones: { productoId: string; promedio: number; total: number }[],
  ) {
    const db = crearDb(TENANT_FINALIZADO)
    db.producto.findMany = vi.fn(async () => productos)
    db.producto.count = vi.fn(async () => productos.length)
    db.productoValoracion.groupBy = vi.fn(async () =>
      valoraciones.map((v) => ({
        productoId: v.productoId,
        _avg: { puntuacion: v.promedio },
        _count: { _all: v.total },
      })),
    )
    return db
  }

  it("agrega puntuacionPromedio y totalValoraciones a cada producto", async () => {
    const db = crearDbConProductos(
      [{ id: "p1" }, { id: "p2" }],
      [{ productoId: "p1", promedio: 4.25, total: 4 }],
    )
    const repo = new TiendaPrismaRepository(db)

    const { data } = await repo.listarCatalogoPublico(SLUG, PARAMS)

    expect(data).toEqual([
      { id: "p1", puntuacionPromedio: 4.3, totalValoraciones: 4 },
      // Sin valoraciones va 0, y la tarjeta muestra "Sin valoraciones" — nunca
      // cinco estrellas vacías (FR-021).
      { id: "p2", puntuacionPromedio: 0, totalValoraciones: 0 },
    ])
  })

  it("excluye las valoraciones ocultas del agregado (SC-005)", async () => {
    const db = crearDbConProductos([{ id: "p1" }], [])
    const repo = new TiendaPrismaRepository(db)

    await repo.listarCatalogoPublico(SLUG, PARAMS)

    expect(db.productoValoracion.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["productoId"],
        where: expect.objectContaining({ estado: "ACTIVO" }),
      }),
    )
  })

  it("resuelve TODA la página con UNA sola consulta agregada, no una por producto", async () => {
    const db = crearDbConProductos(
      Array.from({ length: 12 }, (_, i) => ({ id: `p${i}` })),
      [],
    )
    const repo = new TiendaPrismaRepository(db)

    await repo.listarCatalogoPublico(SLUG, PARAMS)

    // Doce tarjetas, una consulta. Es la razón por la que el agregado viaja acá
    // y no en un endpoint por producto (research R-03).
    expect(db.productoValoracion.groupBy).toHaveBeenCalledTimes(1)
  })

  it("un catálogo vacío no dispara la consulta de valoraciones", async () => {
    const db = crearDbConProductos([], [])
    const repo = new TiendaPrismaRepository(db)

    await repo.listarCatalogoPublico(SLUG, PARAMS)

    expect(db.productoValoracion.groupBy).not.toHaveBeenCalled()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Cambio B5 de la spec 019 — "Productos favoritos de nuestros usuarios".
//
// Se expone el CONTEO de favoritos, nunca quién los guardó: el agregado es
// público, la identidad no. Es la misma línea que la spec 018 traza para la
// autoría de los aportes públicos.
// ────────────────────────────────────────────────────────────────────────────

describe("TiendaPrismaRepository — B5: favoritos de la comunidad", () => {
  function crearDbConFavoritos(
    tenant: Record<string, unknown> | null,
    favoritos: { productoId: string; total: number }[],
    productosActivos: { id: string; nombre: string }[],
  ) {
    const db = crearDb(tenant)
    db.productoFavorito.groupBy = vi.fn(async () =>
      favoritos.map((f) => ({ productoId: f.productoId, _count: { _all: f.total } })),
    )
    db.producto.findMany = vi.fn(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        productosActivos.filter((p) => where.id.in.includes(p.id)),
    )
    return db
  }

  const FAVORITOS = [
    { productoId: "p1", total: 2 },
    { productoId: "p2", total: 7 },
  ]
  const PRODUCTOS = [
    { id: "p1", nombre: "Pan" },
    { id: "p2", nombre: "Leche" },
  ]

  it("ordena por cantidad de personas que lo guardaron, de mayor a menor", async () => {
    const repo = new TiendaPrismaRepository(
      crearDbConFavoritos(TENANT_FINALIZADO, FAVORITOS, PRODUCTOS),
    )

    const favoritos = (await repo.listarFavoritosComunidad(SLUG)) as {
      id: string
      totalFavoritos: number
    }[]

    expect(favoritos.map((f) => f.id)).toEqual(["p2", "p1"])
    expect(favoritos[0].totalFavoritos).toBe(7)
  })

  it("excluye productos que ya no están publicados", async () => {
    // p1 sigue guardado por dos personas pero el comercio lo retiró.
    const repo = new TiendaPrismaRepository(
      crearDbConFavoritos(TENANT_FINALIZADO, FAVORITOS, [{ id: "p2", nombre: "Leche" }]),
    )

    const favoritos = (await repo.listarFavoritosComunidad(SLUG)) as { id: string }[]

    expect(favoritos.map((f) => f.id)).toEqual(["p2"])
  })

  it("NUNCA devuelve la identidad de quién guardó, solo el conteo", async () => {
    const repo = new TiendaPrismaRepository(
      crearDbConFavoritos(TENANT_FINALIZADO, FAVORITOS, PRODUCTOS),
    )

    const favoritos = await repo.listarFavoritosComunidad(SLUG)

    for (const favorito of favoritos as Record<string, unknown>[]) {
      expect(favorito).not.toHaveProperty("userId")
      expect(favorito).toHaveProperty("totalFavoritos")
    }
  })

  it("acota el agregado al comercio y lo topa en 12", async () => {
    const db = crearDbConFavoritos(TENANT_FINALIZADO, FAVORITOS, PRODUCTOS)
    const repo = new TiendaPrismaRepository(db)

    await repo.listarFavoritosComunidad(SLUG)

    expect(db.productoFavorito.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["productoId"],
        where: { tenantId: "tenant-1" },
        take: 12,
      }),
    )
  })

  it("sin favoritos devuelve lista vacía y no consulta productos", async () => {
    const db = crearDbConFavoritos(TENANT_FINALIZADO, [], PRODUCTOS)
    const repo = new TiendaPrismaRepository(db)

    // La vitrina omite la sección entera con esto (FR-026).
    await expect(repo.listarFavoritosComunidad(SLUG)).resolves.toEqual([])
    expect(db.producto.findMany).not.toHaveBeenCalled()
  })

  it("un tenant PENDIENTE no devuelve favoritos", async () => {
    const db = crearDbConFavoritos(TENANT_PENDIENTE, FAVORITOS, PRODUCTOS)
    const repo = new TiendaPrismaRepository(db)

    await expect(repo.listarFavoritosComunidad(SLUG)).resolves.toEqual([])
    expect(db.productoFavorito.groupBy).not.toHaveBeenCalled()
  })
})
