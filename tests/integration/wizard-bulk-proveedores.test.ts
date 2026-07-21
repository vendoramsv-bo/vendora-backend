/**
 * Integration tests — sincronización + protección de Proveedor en
 * POST /api/tenant/proveedores/bulk (specs/018-estandarizar-bulk-wizard).
 *
 * Réplica del handler de wizard.rest.ts (lógica embebida en el adaptador, ver
 * plan.md — Complexity Tracking), contra datos reales.
 *
 * Requiere DATABASE_URL. Skip gracefully cuando no está presente.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "../../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { crearFixturesCompartidas, limpiarFixturesCompartidas, type WizardBulkFixtures } from "../helpers/wizard-bulk-fixtures.js"

const hasDb = !!process.env.DATABASE_URL
const RUN = `wbprov${Date.now()}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any
let fx: WizardBulkFixtures

// Réplica exacta del handler POST /proveedores/bulk (wizard.rest.ts)
async function bulkProveedores(db: typeof prisma, tenantId: string, userId: string, claProveedorIds: string[]) {
  const uniqueIds = [...new Set(claProveedorIds)]
  const claProveedores = await db.claProveedor.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, nombre: true, direccion: true, telefono: true } })
  const claMap = new Map(claProveedores.map((p: { id: string }) => [p.id, p]))

  const existentes = await db.proveedor.findMany({ where: { tenantId, claProveedorId: { not: null } }, select: { claProveedorId: true } })
  const existentesIds: string[] = existentes.map((p: { claProveedorId: string }) => p.claProveedorId)
  const paraAgregar = uniqueIds.filter((id) => !existentesIds.includes(id))
  const paraEliminar = existentesIds.filter((id) => !uniqueIds.includes(id))

  await db.$transaction(async (tx: typeof prisma) => {
    if (paraEliminar.length > 0) {
      const protegidos = await tx.proveedor.findMany({
        where: { tenantId, claProveedorId: { in: paraEliminar }, OR: [{ compras: { some: {} } }, { ingresosAlmacen: { some: {} } }] },
        select: { claProveedorId: true },
      })
      const protegidosIds = new Set(protegidos.map((p: { claProveedorId: string }) => p.claProveedorId))
      const eliminables = paraEliminar.filter((id: string) => !protegidosIds.has(id))
      if (eliminables.length > 0) {
        await tx.proveedor.deleteMany({ where: { tenantId, claProveedorId: { in: eliminables } } })
      }
    }
    if (paraAgregar.length > 0) {
      await tx.proveedor.createMany({
        data: paraAgregar.map((claProveedorId: string) => {
          const cla = claMap.get(claProveedorId) as { nombre?: string; direccion?: string; telefono?: string } | undefined
          return {
            tenantId,
            claProveedorId,
            nombre: cla?.nombre ?? claProveedorId,
            direccion: cla?.direccion ?? undefined,
            telefono: cla?.telefono ?? undefined,
            createdById: userId,
          }
        }),
      })
    }
  })
}

describe.skipIf(!hasDb)("wizard POST /proveedores/bulk", () => {
  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
    fx = await crearFixturesCompartidas(prisma, RUN)
  })

  afterAll(async () => {
    await prisma.compra.deleteMany({ where: { tenantId: fx.tenantId } })
    await limpiarFixturesCompartidas(prisma, RUN)
    await prisma.claProveedor.deleteMany({ where: { id: { contains: RUN } } })
    await prisma.$disconnect()
  })

  it("agrega, quita y no duplica según la selección enviada", async () => {
    const claA = await prisma.claProveedor.create({ data: { id: `CLAPROV-A-${RUN}`, nombre: `Proveedor A ${RUN}` } })
    const claB = await prisma.claProveedor.create({ data: { id: `CLAPROV-B-${RUN}`, nombre: `Proveedor B ${RUN}` } })

    await bulkProveedores(prisma, fx.tenantId, fx.userId, [claA.id, claB.id])
    let existentes = await prisma.proveedor.findMany({ where: { tenantId: fx.tenantId, claProveedorId: { not: null } } })
    expect(existentes.length).toBe(2)

    await bulkProveedores(prisma, fx.tenantId, fx.userId, [claA.id])
    existentes = await prisma.proveedor.findMany({ where: { tenantId: fx.tenantId, claProveedorId: { not: null } } })
    expect(existentes.map((p: { claProveedorId: string }) => p.claProveedorId)).toEqual([claA.id])

    await bulkProveedores(prisma, fx.tenantId, fx.userId, [claA.id])
    existentes = await prisma.proveedor.findMany({ where: { tenantId: fx.tenantId, claProveedorId: { not: null } } })
    expect(existentes.length).toBe(1)
  })

  it("protege un proveedor con una compra registrada al deseleccionarlo (antes: rompía la transacción por FK)", async () => {
    const cla = await prisma.claProveedor.create({ data: { id: `CLAPROV-COMPRA-${RUN}`, nombre: `Proveedor Con Compra ${RUN}` } })
    await bulkProveedores(prisma, fx.tenantId, fx.userId, [cla.id])
    const proveedor = await prisma.proveedor.findFirst({ where: { tenantId: fx.tenantId, claProveedorId: cla.id } })

    await prisma.compra.create({ data: { tenantId: fx.tenantId, proveedorId: proveedor.id, createdById: fx.userId } })

    // No debe lanzar (antes de la protección, esto rompía por FK NO ACTION)
    await expect(bulkProveedores(prisma, fx.tenantId, fx.userId, [])).resolves.not.toThrow()

    const sigueExistiendo = await prisma.proveedor.findUnique({ where: { id: proveedor.id } })
    expect(sigueExistiendo).not.toBeNull()
  })
})
