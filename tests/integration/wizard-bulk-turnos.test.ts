/**
 * Integration tests — sincronización + protección de TurnosDeAtencion en
 * POST /api/tenant/turnos/bulk (specs/018-estandarizar-bulk-wizard).
 *
 * Réplica del handler de wizard.rest.ts (lógica embebida en el adaptador, ver
 * plan.md — Complexity Tracking), contra datos reales.
 *
 * Requiere DATABASE_URL. Skip gracefully cuando no está presente.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "../../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  crearFixturesCompartidas,
  crearProductoConClasificador,
  limpiarFixturesCompartidas,
  type WizardBulkFixtures,
} from "../helpers/wizard-bulk-fixtures.js"

const hasDb = !!process.env.DATABASE_URL
const RUN = `wbturno${Date.now()}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any
let fx: WizardBulkFixtures

// Réplica exacta del handler POST /turnos/bulk (wizard.rest.ts)
async function bulkTurnos(db: typeof prisma, tenantId: string, userId: string, claTurnoIds: string[]) {
  const uniqueIds = [...new Set(claTurnoIds)]
  const claTurnos = await db.claTurnosDeAtencion.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, turno: true } })
  const claMap = new Map(claTurnos.map((t: { id: string; turno: string }) => [t.id, t.turno]))

  const existentes = await db.turnosDeAtencion.findMany({ where: { tenantId, claTurnoId: { not: null } }, select: { claTurnoId: true } })
  const existentesIds: string[] = existentes.map((t: { claTurnoId: string }) => t.claTurnoId)
  const paraAgregar = uniqueIds.filter((id) => !existentesIds.includes(id))
  const paraEliminar = existentesIds.filter((id) => !uniqueIds.includes(id))

  await db.$transaction(async (tx: typeof prisma) => {
    if (paraEliminar.length > 0) {
      const protegidos = await tx.turnosDeAtencion.findMany({
        where: { tenantId, claTurnoId: { in: paraEliminar }, OR: [{ ventas: { some: {} } }, { aperturasCierresDeCaja: { some: {} } }] },
        select: { claTurnoId: true },
      })
      const protegidosIds = new Set(protegidos.map((t: { claTurnoId: string }) => t.claTurnoId))
      const eliminables = paraEliminar.filter((id: string) => !protegidosIds.has(id))
      if (eliminables.length > 0) {
        await tx.turnosDeAtencion.deleteMany({ where: { tenantId, claTurnoId: { in: eliminables } } })
      }
    }
    if (paraAgregar.length > 0) {
      await tx.turnosDeAtencion.createMany({
        data: paraAgregar.map((claTurnoId: string) => ({
          tenantId,
          claTurnoId,
          turno: claMap.get(claTurnoId) ?? claTurnoId,
          createdById: userId,
        })),
      })
    }
  })
}

describe.skipIf(!hasDb)("wizard POST /turnos/bulk", () => {
  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
    fx = await crearFixturesCompartidas(prisma, RUN)
  })

  afterAll(async () => {
    await limpiarFixturesCompartidas(prisma, RUN)
    await prisma.claTurnosDeAtencion.deleteMany({ where: { id: { contains: RUN } } })
    await prisma.$disconnect()
  })

  it("agrega, quita y no duplica según la selección enviada", async () => {
    const claA = await prisma.claTurnosDeAtencion.create({ data: { id: `CLATURNO-A-${RUN}`, turno: `Mañana ${RUN}` } })
    const claB = await prisma.claTurnosDeAtencion.create({ data: { id: `CLATURNO-B-${RUN}`, turno: `Tarde ${RUN}` } })

    await bulkTurnos(prisma, fx.tenantId, fx.userId, [claA.id, claB.id])
    let existentes = await prisma.turnosDeAtencion.findMany({ where: { tenantId: fx.tenantId, claTurnoId: { not: null } } })
    expect(existentes.length).toBe(2)

    await bulkTurnos(prisma, fx.tenantId, fx.userId, [claA.id])
    existentes = await prisma.turnosDeAtencion.findMany({ where: { tenantId: fx.tenantId, claTurnoId: { not: null } } })
    expect(existentes.map((t: { claTurnoId: string }) => t.claTurnoId)).toEqual([claA.id])

    await bulkTurnos(prisma, fx.tenantId, fx.userId, [claA.id])
    existentes = await prisma.turnosDeAtencion.findMany({ where: { tenantId: fx.tenantId, claTurnoId: { not: null } } })
    expect(existentes.length).toBe(1)
  })

  it("protege un turno con una venta registrada al deseleccionarlo (mismo criterio que PuntosDeVenta)", async () => {
    const cla = await prisma.claTurnosDeAtencion.create({ data: { id: `CLATURNO-VENTA-${RUN}`, turno: `Turno Con Venta ${RUN}` } })
    await bulkTurnos(prisma, fx.tenantId, fx.userId, [cla.id])
    const turno = await prisma.turnosDeAtencion.findFirst({ where: { tenantId: fx.tenantId, claTurnoId: cla.id } })

    const p = await crearProductoConClasificador(prisma, fx, `TURNO-VENTA-${RUN}`, `Producto Turno ${RUN}`)
    const apertura = await prisma.aperturaCierreDeCaja.create({
      data: { tenantId: fx.tenantId, puntoVentaId: fx.puntoVentaId, turnoId: turno.id, tenantMemberId: fx.tenantMemberId, fecha: new Date() },
    })
    const venta = await prisma.venta.create({
      data: {
        tenantId: fx.tenantId,
        puntoVentaId: fx.puntoVentaId,
        turnoId: turno.id,
        tenantMemberId: fx.tenantMemberId,
        aperturaCierreCajaId: apertura.id,
        createdById: fx.userId,
      },
    })
    await prisma.ventaDetalle.create({ data: { ventaId: venta.id, productoId: p.productoId, cantidad: 1, precio: 10, total: 10 } })

    await bulkTurnos(prisma, fx.tenantId, fx.userId, []) // el usuario deselecciona todo, incluido este turno

    const sigueExistiendo = await prisma.turnosDeAtencion.findUnique({ where: { id: turno.id } })
    expect(sigueExistiendo).not.toBeNull()
  })
})
