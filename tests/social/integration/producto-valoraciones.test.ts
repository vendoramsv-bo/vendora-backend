import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Cambio B4 de la spec 019 — las valoraciones de PRODUCTO omiten lo oculto.
 *
 * Es exactamente el mismo hueco que la spec 018 cerró con su cambio C2 para las
 * valoraciones del comercio, y que en producto había quedado abierto: una reseña
 * que el comercio ocultó seguía pesando en el promedio público.
 *
 * Sin esto, SC-005 —"el promedio coincide con las valoraciones visibles, y las
 * ocultas nunca lo alteran"— es inverificable.
 */

const valoracionAggregate = vi.fn()
const valoracionFindMany = vi.fn()
const valoracionCount = vi.fn()

vi.mock("../../../src/core/prisma-scoped.js", () => ({
  prismaBase: {
    productoValoracion: {
      aggregate: (...a: unknown[]) => valoracionAggregate(...a),
      findMany: (...a: unknown[]) => valoracionFindMany(...a),
      count: (...a: unknown[]) => valoracionCount(...a),
    },
  },
}))

const { ProductoSocialPrismaRepository } = await import(
  "../../../src/modules/social/infrastructure/producto-social.prisma.repository.js"
)

const PRODUCTO_ID = "p1"
const TENANT_ID = "tenant-1"

beforeEach(() => {
  vi.clearAllMocks()
  valoracionAggregate.mockResolvedValue({ _avg: { puntuacion: 4.5 } })
  valoracionFindMany.mockResolvedValue([])
  valoracionCount.mockResolvedValue(0)
})

describe("ProductoSocialPrismaRepository — B4: promedio público", () => {
  it("solo promedia valoraciones ACTIVO", async () => {
    const repo = new ProductoSocialPrismaRepository()

    await repo.getPromedioValoracionesProducto(PRODUCTO_ID)

    expect(valoracionAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productoId: PRODUCTO_ID, estado: "ACTIVO" },
      }),
    )
  })

  it("un producto sin valoraciones visibles promedia 0, no null", async () => {
    valoracionAggregate.mockResolvedValue({ _avg: { puntuacion: null } })
    const repo = new ProductoSocialPrismaRepository()

    await expect(repo.getPromedioValoracionesProducto(PRODUCTO_ID)).resolves.toBe(0)
  })
})

describe("ProductoSocialPrismaRepository — B4: listado público", () => {
  const PARAMS = { take: 10, page: 1, order: "desc" as const }

  it("solo lista valoraciones ACTIVO del producto y del comercio", async () => {
    const repo = new ProductoSocialPrismaRepository()

    await repo.listarValoracionesProducto(PRODUCTO_ID, TENANT_ID, PARAMS)

    const where = { productoId: PRODUCTO_ID, tenantId: TENANT_ID, estado: "ACTIVO" }
    expect(valoracionFindMany).toHaveBeenCalledWith(expect.objectContaining({ where }))
    expect(valoracionCount).toHaveBeenCalledWith({ where })
  })

  it("el conteo usa el mismo filtro que la lista — si no, el total mentiría", async () => {
    const repo = new ProductoSocialPrismaRepository()

    await repo.listarValoracionesProducto(PRODUCTO_ID, TENANT_ID, PARAMS)

    const whereLista = valoracionFindMany.mock.calls[0][0].where
    const whereConteo = valoracionCount.mock.calls[0][0].where
    expect(whereConteo).toEqual(whereLista)
  })
})
