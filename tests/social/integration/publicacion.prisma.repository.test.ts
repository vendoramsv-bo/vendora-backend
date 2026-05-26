import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PublicacionPrismaRepository } from "../../../src/modules/social/infrastructure/publicacion.prisma.repository.js"
import { prismaBase } from "../../../src/core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

const HAS_DB = !!process.env.DATABASE_URL

describe.skipIf(!HAS_DB)("PublicacionPrismaRepository — integration", () => {
  const repo = new PublicacionPrismaRepository()
  const userId = "test-pub-user-" + Date.now()
  let tenantId: string
  let publicacionId: string

  beforeAll(async () => {
    const tenant = await db.tenant.create({
      data: { nombre: "Test Pub Tenant", slug: "test-pub-" + Date.now(), plan: "BASICO" },
    })
    tenantId = tenant.id

    const pub = await repo.create({
      tenantId,
      autorId: userId,
      tipo: "TEXTO",
      etiquetas: ["test"],
      medios: [],
      contenido: "Contenido de prueba",
    })
    publicacionId = pub.id
  })

  afterAll(async () => {
    await db.publicacion.deleteMany({ where: { tenantId } })
    await db.tenant.delete({ where: { id: tenantId } })
  })

  it("cambiarEstado: BORRADOR → PUBLICADO", async () => {
    const updated = await repo.cambiarEstado(publicacionId, "PUBLICADO", new Date())
    expect(updated.estado).toBe("PUBLICADO")
    expect(updated.publicadoEn).toBeTruthy()
  })

  it("upsertReaccionPublicacion: mismo tipo → toggle", async () => {
    const { removed } = await repo.upsertReaccionPublicacion(publicacionId, userId, "ME_GUSTA")
    expect(removed).toBe(false)

    const { removed: removed2 } = await repo.upsertReaccionPublicacion(publicacionId, userId, "ME_GUSTA")
    expect(removed2).toBe(true)
  })

  it("cascade: eliminar comentario padre elimina respuestas", async () => {
    const padre = await repo.crearComentarioPublicacion({ publicacionId, userId, contenido: "Comentario padre" })
    await repo.crearComentarioPublicacion({ publicacionId, userId, contenido: "Respuesta", padreId: padre.id })

    await repo.deleteRespuestasPublicacion(padre.id)
    await repo.deleteComentarioPublicacion(padre.id)

    const found = await repo.findComentarioPublicacion(padre.id)
    expect(found).toBeNull()
  })

  it("findPublicas: solo devuelve estado=PUBLICADO", async () => {
    const result = await repo.findPublicas(tenantId, { take: 20, skip: 0, order: "desc" })
    expect(result.data.every((p) => p.estado === "PUBLICADO")).toBe(true)
  })
})
