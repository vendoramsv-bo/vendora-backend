import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { TiendaSocialPrismaRepository } from "../../../src/modules/social/infrastructure/tienda-social.prisma.repository.js"
import { TiendaNoEncontrada } from "../../../src/modules/social/domain/social.errors.js"
import { prismaBase } from "../../../src/core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

const HAS_DB = !!process.env.DATABASE_URL

describe.skipIf(!HAS_DB)("TiendaSocialPrismaRepository — integration", () => {
  const repo = new TiendaSocialPrismaRepository()
  const userId = "test-tienda-user-" + Date.now()
  const slug = "test-tienda-social-" + Date.now()
  let tenantId: string

  beforeAll(async () => {
    const tenant = await db.tenant.create({
      data: { nombre: "Test Tienda Social", slug, plan: "BASICO", esTienda: true },
    })
    tenantId = tenant.id

    await db.tienda.create({
      data: { tenantId, nombre: "Tienda Test Social", descripcion: "Test" },
    })
  })

  afterAll(async () => {
    await db.tienda.deleteMany({ where: { tenantId } })
    await db.tenant.delete({ where: { id: tenantId } })
  })

  it("resolveTiendaId: lanza TiendaNoEncontrada para tenant sin esTienda", async () => {
    const slugSinTienda = "tenant-sin-tienda-" + Date.now()
    await db.tenant.create({ data: { nombre: "Sin Tienda", slug: slugSinTienda, plan: "BASICO", esTienda: false } })
    await expect(repo.resolveTiendaId(slugSinTienda)).rejects.toThrow(TiendaNoEncontrada)
    await db.tenant.delete({ where: { slug: slugSinTienda } })
  })

  it("resolveTiendaId: devuelve tiendaId válido", async () => {
    const tiendaId = await repo.resolveTiendaId(slug)
    expect(typeof tiendaId).toBe("string")
    expect(tiendaId.length).toBeGreaterThan(0)
  })

  it("upsertReaccionTienda: mismo tipo → toggle (remove)", async () => {
    const tiendaId = await repo.resolveTiendaId(slug)
    const { removed } = await repo.upsertReaccionTienda(tiendaId, userId, "ME_GUSTA")
    expect(removed).toBe(false)

    const { removed: removed2 } = await repo.upsertReaccionTienda(tiendaId, userId, "ME_GUSTA")
    expect(removed2).toBe(true)
  })

  it("toggleSeguirTienda: crea y elimina seguimiento", async () => {
    const tiendaId = await repo.resolveTiendaId(slug)
    const { siguiendo } = await repo.toggleSeguirTienda(tiendaId, userId)
    expect(siguiendo).toBe(true)

    const count = await repo.contarSeguidoresTienda(tiendaId)
    expect(count).toBeGreaterThanOrEqual(1)

    const { siguiendo: siguiendo2 } = await repo.toggleSeguirTienda(tiendaId, userId)
    expect(siguiendo2).toBe(false)
  })
})
