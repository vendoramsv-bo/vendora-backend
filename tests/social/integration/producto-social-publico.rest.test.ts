import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Regla C1 aplicada al social de PRODUCTO (spec 019, cambio B6).
 *
 * La spec 018 estableció que un comercio solo es público con el wizard en
 * `FINALIZADO`, y lo aplicó en el repositorio de tienda, en el social de tienda y
 * en las publicaciones. Pero `producto-social.rest.ts` tiene su **propio**
 * `resolveSlugTenantId`, que quedó resolviendo por slug a secas: las reacciones,
 * comentarios, valoraciones y preguntas de producto de un comercio a medio crear
 * seguían siendo públicas. Era una fuga abierta del SC-012 de la 018.
 *
 * Este test la cubre a nivel de ruta, que es donde vive el guard. Se mockea el
 * cliente Prisma para no depender de una base real.
 */

const tenantFindFirst = vi.fn()

vi.mock("../../../src/core/prisma-scoped.js", () => ({
  prismaBase: {
    tenant: {
      findFirst: (...args: unknown[]) => tenantFindFirst(...args),
      findUnique: (...args: unknown[]) => tenantFindFirst(...args),
    },
  },
}))

const { publicProductoSocialRouter } = await import(
  "../../../src/modules/social/adapters/producto-social.rest.js"
)

const SLUG = "tienda-a-medio-crear"
const RUTAS_PUBLICAS = [
  `/${SLUG}/productos/p1/reacciones`,
  `/${SLUG}/productos/p1/comentarios`,
  `/${SLUG}/productos/p1/valoraciones`,
  `/${SLUG}/productos/p1/preguntas`,
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Social público de producto — C1: solo comercios con la creación completa", () => {
  it("consulta el tenant filtrando por estado FINALIZADO", async () => {
    tenantFindFirst.mockResolvedValue(null)

    await publicProductoSocialRouter.request(RUTAS_PUBLICAS[0])

    expect(tenantFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: SLUG, estado: "FINALIZADO" },
      }),
    )
  })

  it.each(RUTAS_PUBLICAS)("responde 404 en %s cuando el tenant no está FINALIZADO", async (ruta) => {
    // El `where` con estado FINALIZADO no encuentra al tenant PENDIENTE.
    tenantFindFirst.mockResolvedValue(null)

    const res = await publicProductoSocialRouter.request(ruta)

    expect(res.status).toBe(404)
  })

  it("un tenant PENDIENTE es indistinguible de un slug inexistente (SC-012)", async () => {
    tenantFindFirst.mockResolvedValue(null)
    const resPendiente = await publicProductoSocialRouter.request(RUTAS_PUBLICAS[0])
    const cuerpoPendiente = await resPendiente.json()

    vi.clearAllMocks()
    tenantFindFirst.mockResolvedValue(null)
    const resInexistente = await publicProductoSocialRouter.request(
      "/slug-que-no-existe/productos/p1/reacciones",
    )
    const cuerpoInexistente = await resInexistente.json()

    expect(resPendiente.status).toBe(resInexistente.status)
    expect(cuerpoPendiente).toEqual(cuerpoInexistente)
  })
})
