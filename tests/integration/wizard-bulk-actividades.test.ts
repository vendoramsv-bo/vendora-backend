/**
 * Integration tests — sincronización + protección de ActividadEconomica en
 * POST /api/tenant/actividades-economicas/bulk (specs/018-estandarizar-bulk-wizard).
 *
 * La lógica vive embebida en el adaptador wizard.rest.ts (decisión documentada en
 * plan.md — Complexity Tracking), sin una capa de aplicación propia que se pueda
 * invocar directo en un test. Estos tests reproducen exactamente el mismo patrón
 * agregar/paraEliminar + filtro de protección que usa el handler, contra datos
 * reales, para validar la semántica de las relaciones Prisma usadas en producción
 * (`producto: { some: { ventasDetalle: { some: {} } } }`).
 *
 * Requiere DATABASE_URL. Skip gracefully cuando no está presente.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "../../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  crearFixturesCompartidas,
  crearProductoConClasificador,
  crearVentaConDetalle,
  limpiarFixturesCompartidas,
  type WizardBulkFixtures,
} from "../helpers/wizard-bulk-fixtures.js"

const hasDb = !!process.env.DATABASE_URL
const RUN = `wbact${Date.now()}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any
let fx: WizardBulkFixtures

// Réplica exacta del handler POST /actividades-economicas/bulk (wizard.rest.ts)
async function bulkActividades(db: typeof prisma, tenantId: string, userId: string, ids: string[]) {
  const uniqueIds = [...new Set(ids)]
  const existentes = await db.actividadEconomica.findMany({ where: { tenantId }, select: { claActividadId: true } })
  const existentesIds: string[] = existentes.map((e: { claActividadId: string }) => e.claActividadId)
  const paraAgregar = uniqueIds.filter((id) => !existentesIds.includes(id))
  const paraEliminar = existentesIds.filter((id) => !uniqueIds.includes(id))

  await db.$transaction(async (tx: typeof prisma) => {
    if (paraEliminar.length > 0) {
      const protegidas = await tx.actividadEconomica.findMany({
        where: { tenantId, claActividadId: { in: paraEliminar }, producto: { some: { ventasDetalle: { some: {} } } } },
        select: { claActividadId: true },
      })
      const protegidasIds = new Set(protegidas.map((p: { claActividadId: string }) => p.claActividadId))
      const eliminables = paraEliminar.filter((id: string) => !protegidasIds.has(id))
      if (eliminables.length > 0) {
        await tx.actividadEconomica.deleteMany({ where: { tenantId, claActividadId: { in: eliminables } } })
      }
    }
    if (paraAgregar.length > 0) {
      await tx.actividadEconomica.createMany({
        data: paraAgregar.map((claActividadId: string) => ({ tenantId, claActividadId, createdById: userId })),
      })
    }
  })
}

describe.skipIf(!hasDb)("wizard POST /actividades-economicas/bulk", () => {
  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
    fx = await crearFixturesCompartidas(prisma, RUN)
  })

  afterAll(async () => {
    await prisma.actividadEconomica.deleteMany({ where: { tenantId: fx.tenantId } })
    await limpiarFixturesCompartidas(prisma, RUN)
    await prisma.claActividadEconomica.deleteMany({ where: { codigo: { contains: RUN } } })
    await prisma.$disconnect()
  })

  it("agrega, quita y no duplica según la selección enviada", async () => {
    const claB = await prisma.claActividadEconomica.create({ data: { codigo: `CLA-ACT-B-${RUN}`, nombre: `Actividad B ${RUN}` } })
    const claC = await prisma.claActividadEconomica.create({ data: { codigo: `CLA-ACT-C-${RUN}`, nombre: `Actividad C ${RUN}` } })

    // fx.claActividadId ya viene con una ActividadEconomica creada en el fixture — la incluimos en la selección inicial
    await bulkActividades(prisma, fx.tenantId, fx.userId, [fx.claActividadId, claB.id, claC.id])
    let existentes = await prisma.actividadEconomica.findMany({ where: { tenantId: fx.tenantId } })
    expect(existentes.map((a: { claActividadId: string }) => a.claActividadId).sort()).toEqual([fx.claActividadId, claB.id, claC.id].sort())

    // Reenviar sin claC → debe desaparecer
    await bulkActividades(prisma, fx.tenantId, fx.userId, [fx.claActividadId, claB.id])
    existentes = await prisma.actividadEconomica.findMany({ where: { tenantId: fx.tenantId } })
    expect(existentes.map((a: { claActividadId: string }) => a.claActividadId).sort()).toEqual([fx.claActividadId, claB.id].sort())

    // Reenviar la misma selección — idempotente, sin duplicados
    await bulkActividades(prisma, fx.tenantId, fx.userId, [fx.claActividadId, claB.id])
    existentes = await prisma.actividadEconomica.findMany({ where: { tenantId: fx.tenantId } })
    expect(existentes.length).toBe(2)
  })

  it("protege una actividad cuyo producto ya tiene ventas reales al deseleccionarla", async () => {
    const p = await crearProductoConClasificador(prisma, fx, `ACT-PROT-${RUN}`, `Producto Protegido ${RUN}`)
    await crearVentaConDetalle(prisma, fx, p.productoId)

    await bulkActividades(prisma, fx.tenantId, fx.userId, [fx.claActividadId])
    await bulkActividades(prisma, fx.tenantId, fx.userId, []) // el usuario deselecciona todo, incluida fx.claActividadId

    const sigueExistiendo = await prisma.actividadEconomica.findFirst({ where: { tenantId: fx.tenantId, claActividadId: fx.claActividadId } })
    expect(sigueExistiendo).not.toBeNull()
  })
})
