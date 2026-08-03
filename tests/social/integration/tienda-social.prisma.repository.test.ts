import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
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
    // estado FINALIZADO: desde el cambio C1 (spec 018) un tenant sin terminar
    // el wizard no resuelve en ninguna ruta publica.
    const tenant = await db.tenant.create({
      data: { nombre: "Test Tienda Social", slug, plan: "BASICO", esTienda: true, estado: "FINALIZADO" },
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

// ────────────────────────────────────────────────────────────────────────────
// C1 + C2 de la vitrina publica (spec 018) — sin base de datos.
//
// C1 (FR-049): un comercio con la creacion incompleta no resuelve por slug.
// C2 (FR-052, SC-013): las listas publicas de valoraciones y comentarios omiten
//     los aportes ocultos, y el promedio no los cuenta. Las preguntas ya lo
//     hacian y deben seguir igual.
//
// El repositorio recibe el cliente Prisma por constructor, asi que se le pasa un
// doble que registra los `where` con los que se lo consulta.
// ────────────────────────────────────────────────────────────────────────────

const TIENDA_ID = "tienda-1"

function crearDbFake(tenant: Record<string, unknown> | null) {
  const listaVacia = { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) }
  return {
    tenant: { findUnique: vi.fn(async () => tenant) },
    tiendaComentario: { ...listaVacia },
    tiendaValoracion: {
      ...listaVacia,
      aggregate: vi.fn(async () => ({ _avg: { puntuacion: null } })),
    },
    tiendaPregunta: { ...listaVacia },
  }
}

const TENANT_OK = {
  id: "tenant-1",
  esTienda: true,
  estado: "FINALIZADO",
  tienda: { id: TIENDA_ID },
}

const PARAMS = { take: 10, page: 1, order: "desc" as const }

describe("TiendaSocialPrismaRepository — C1: solo comercios con la creacion completa", () => {
  it("resolveTiendaId lanza TiendaNoEncontrada si el tenant esta PENDIENTE", async () => {
    const repo = new TiendaSocialPrismaRepository(
      crearDbFake({ ...TENANT_OK, estado: "PENDIENTE" }),
    )
    await expect(repo.resolveTiendaId("cualquier-slug")).rejects.toThrow(TiendaNoEncontrada)
  })

  it("resolveTiendaInfo lanza TiendaNoEncontrada si el tenant esta PENDIENTE", async () => {
    const repo = new TiendaSocialPrismaRepository(
      crearDbFake({ ...TENANT_OK, estado: "PENDIENTE" }),
    )
    await expect(repo.resolveTiendaInfo("cualquier-slug")).rejects.toThrow(TiendaNoEncontrada)
  })

  it("un tenant PENDIENTE falla igual que un slug inexistente", async () => {
    const conPendiente = new TiendaSocialPrismaRepository(
      crearDbFake({ ...TENANT_OK, estado: "PENDIENTE" }),
    )
    const sinTenant = new TiendaSocialPrismaRepository(crearDbFake(null))

    const errorPendiente = await conPendiente.resolveTiendaId("s").catch((e) => e)
    const errorInexistente = await sinTenant.resolveTiendaId("s").catch((e) => e)

    expect(errorPendiente.constructor).toBe(errorInexistente.constructor)
    expect(errorPendiente.message).toBe(errorInexistente.message)
  })

  it("resuelve normalmente cuando el tenant esta FINALIZADO", async () => {
    const repo = new TiendaSocialPrismaRepository(crearDbFake(TENANT_OK))
    await expect(repo.resolveTiendaId("s")).resolves.toBe(TIENDA_ID)
    await expect(repo.resolveTiendaInfo("s")).resolves.toEqual({
      tiendaId: TIENDA_ID,
      tenantId: "tenant-1",
    })
  })
})

describe("TiendaSocialPrismaRepository — C2: la vitrina no muestra aportes ocultos", () => {
  it("listarValoracionesTienda filtra por estado ACTIVO", async () => {
    const db = crearDbFake(TENANT_OK)
    const repo = new TiendaSocialPrismaRepository(db)

    await repo.listarValoracionesTienda(TIENDA_ID, PARAMS)

    const where = { tiendaId: TIENDA_ID, estado: "ACTIVO" }
    expect(db.tiendaValoracion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }))
    expect(db.tiendaValoracion.count).toHaveBeenCalledWith({ where })
  })

  it("getPromedioValoracionesTienda no pesa las valoraciones ocultas", async () => {
    const db = crearDbFake(TENANT_OK)
    const repo = new TiendaSocialPrismaRepository(db)

    await repo.getPromedioValoracionesTienda(TIENDA_ID)

    expect(db.tiendaValoracion.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tiendaId: TIENDA_ID, estado: "ACTIVO" } }),
    )
  })

  it("listarComentariosTienda filtra ACTIVO en las raices y en las respuestas", async () => {
    const db = crearDbFake(TENANT_OK)
    const repo = new TiendaSocialPrismaRepository(db)

    await repo.listarComentariosTienda(TIENDA_ID, PARAMS)

    const where = { tiendaId: TIENDA_ID, padreId: null, estado: "ACTIVO" }
    expect(db.tiendaComentario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        include: expect.objectContaining({
          respuestas: expect.objectContaining({ where: { estado: "ACTIVO" } }),
        }),
      }),
    )
    expect(db.tiendaComentario.count).toHaveBeenCalledWith({ where })
  })

  it("listarPreguntasTienda sigue filtrando ACTIVO como antes", async () => {
    const db = crearDbFake(TENANT_OK)
    const repo = new TiendaSocialPrismaRepository(db)

    await repo.listarPreguntasTienda(TIENDA_ID, PARAMS)

    expect(db.tiendaPregunta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tiendaId: TIENDA_ID, estado: "ACTIVO" },
        include: expect.objectContaining({
          respuestas: expect.objectContaining({ where: { estado: "ACTIVO" } }),
        }),
      }),
    )
  })
})
