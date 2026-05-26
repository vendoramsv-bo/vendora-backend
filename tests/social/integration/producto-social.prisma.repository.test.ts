import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { ProductoSocialPrismaRepository } from "../../../src/modules/social/infrastructure/producto-social.prisma.repository.js"
import { prismaBase } from "../../../src/core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

const HAS_DB = !!process.env.DATABASE_URL

describe.skipIf(!HAS_DB)("ProductoSocialPrismaRepository — integration", () => {
  const repo = new ProductoSocialPrismaRepository()
  let tenantId: string
  let productoId: string
  const userId = "test-user-social-" + Date.now()

  beforeAll(async () => {
    const tenant = await db.tenant.create({
      data: { nombre: "Test Social Tenant", slug: "test-social-" + Date.now(), plan: "BASICO" },
    })
    tenantId = tenant.id

    const categoria = await db.categoriaCatalogo.create({
      data: { tenantId, nombre: "Test Cat Social", orden: 0, estado: "ACTIVO" },
    })

    const producto = await db.producto.create({
      data: { tenantId, categoriaId: categoria.id, nombre: "Producto Social Test", precio: 100, estado: "ACTIVO", tipo: "PRODUCTO" },
    })
    productoId = producto.id
  })

  afterAll(async () => {
    await db.producto.deleteMany({ where: { tenantId } })
    await db.categoriaCatalogo.deleteMany({ where: { tenantId } })
    await db.tenant.delete({ where: { id: tenantId } })
  })

  it("toggleReaccionProducto: crea y luego elimina reacción (toggle)", async () => {
    const { reaccion, removed } = await repo.toggleReaccionProducto(productoId, tenantId, userId, "❤️")
    expect(removed).toBe(false)
    expect(reaccion?.emoji).toBe("❤️")

    const { removed: removed2 } = await repo.toggleReaccionProducto(productoId, tenantId, userId, "❤️")
    expect(removed2).toBe(true)
  })

  it("upsertValoracionProducto: crea y luego actualiza", async () => {
    const v1 = await repo.upsertValoracionProducto({ productoId, tenantId, userId, puntuacion: 3 })
    expect(v1.puntuacion).toBe(3)

    const v2 = await repo.upsertValoracionProducto({ productoId, tenantId, userId, puntuacion: 5, resena: "Excelente" })
    expect(v2.puntuacion).toBe(5)
    expect(v2.resena).toBe("Excelente")
    expect(v2.id).toBe(v1.id)
  })

  it("cascade: eliminar respuestas antes de padre", async () => {
    const padre = await repo.crearComentarioProducto({ productoId, tenantId, userId, contenido: "Padre" })
    await repo.crearComentarioProducto({ productoId, tenantId, userId, contenido: "Respuesta 1", padreId: padre.id })
    await repo.crearComentarioProducto({ productoId, tenantId, userId, contenido: "Respuesta 2", padreId: padre.id })

    await repo.deleteRespuestasProducto(padre.id)
    await repo.deleteComentarioProducto(padre.id)

    const found = await repo.findComentarioProducto(padre.id)
    expect(found).toBeNull()
  })

  it("toggleFavoritoProducto: crea y elimina favorito", async () => {
    const { favorito } = await repo.toggleFavoritoProducto(productoId, tenantId, userId)
    expect(favorito).toBe(true)

    const { favorito: favorito2 } = await repo.toggleFavoritoProducto(productoId, tenantId, userId)
    expect(favorito2).toBe(false)
  })
})
