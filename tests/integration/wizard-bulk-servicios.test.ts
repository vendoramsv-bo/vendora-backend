/**
 * Integration tests — sincronización + protección de ServicioMedico en
 * POST /api/tenant/catalogo/servicios/bulk (specs/018-estandarizar-bulk-wizard).
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
const RUN = `wbserv${Date.now()}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any
let fx: WizardBulkFixtures

// Réplica exacta del handler POST /catalogo/servicios/bulk (wizard.rest.ts)
async function bulkServicios(db: typeof prisma, consultorioId: string, userId: string, ids: string[]) {
  const uniqueNombres = [...new Set(ids)]
  const existentes = await db.servicioMedico.findMany({ where: { consultorioId }, select: { nombre: true } })
  const existentesNombres: string[] = existentes.map((s: { nombre: string }) => s.nombre)
  const paraAgregar = uniqueNombres.filter((n) => !existentesNombres.includes(n))
  const paraEliminar = existentesNombres.filter((n) => !uniqueNombres.includes(n))

  let creados = 0
  await db.$transaction(async (tx: typeof prisma) => {
    if (paraEliminar.length > 0) {
      const protegidos = await tx.servicioMedico.findMany({
        where: { consultorioId, nombre: { in: paraEliminar }, OR: [{ citas: { some: {} } }, { atencionesDetalle: { some: {} } }] },
        select: { nombre: true },
      })
      const protegidosNombres = new Set(protegidos.map((p: { nombre: string }) => p.nombre))
      const eliminables = paraEliminar.filter((n: string) => !protegidosNombres.has(n))
      if (eliminables.length > 0) {
        await tx.servicioMedico.deleteMany({ where: { consultorioId, nombre: { in: eliminables } } })
      }
    }
    if (paraAgregar.length > 0) {
      const result = await tx.servicioMedico.createMany({
        data: paraAgregar.map((nombre: string) => ({ consultorioId, nombre, createdById: userId })),
        skipDuplicates: true,
      })
      creados = result.count
    }
  })
  return creados
}

describe.skipIf(!hasDb)("wizard POST /catalogo/servicios/bulk", () => {
  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
    fx = await crearFixturesCompartidas(prisma, RUN)
  })

  afterAll(async () => {
    await limpiarFixturesCompartidas(prisma, RUN)
    await prisma.$disconnect()
  })

  it("agrega, quita y no duplica según la selección enviada", async () => {
    const nombreA = `Consulta General ${RUN}`
    const nombreB = `Odontologia ${RUN}`
    const nombreC = `Pediatria ${RUN}`

    const creados = await bulkServicios(prisma, fx.consultorioId, fx.userId, [nombreA, nombreB, nombreC])
    expect(creados).toBe(3)

    let existentes = await prisma.servicioMedico.findMany({ where: { consultorioId: fx.consultorioId } })
    expect(existentes.length).toBe(3)

    // El usuario quita "Pediatria" y reenvía
    await bulkServicios(prisma, fx.consultorioId, fx.userId, [nombreA, nombreB])
    existentes = await prisma.servicioMedico.findMany({ where: { consultorioId: fx.consultorioId } })
    expect(existentes.map((s: { nombre: string }) => s.nombre).sort()).toEqual([nombreA, nombreB].sort())

    // Reenviar la misma selección no duplica
    await bulkServicios(prisma, fx.consultorioId, fx.userId, [nombreA, nombreB])
    existentes = await prisma.servicioMedico.findMany({ where: { consultorioId: fx.consultorioId } })
    expect(existentes.length).toBe(2)
  })

  it("protege un servicio con una cita registrada al deseleccionarlo", async () => {
    const nombre = `Servicio Con Cita ${RUN}`
    await bulkServicios(prisma, fx.consultorioId, fx.userId, [nombre])
    const servicio = await prisma.servicioMedico.findFirst({ where: { consultorioId: fx.consultorioId, nombre } })

    await prisma.cita.create({
      data: {
        consultorioId: fx.consultorioId,
        medicoId: fx.medicoId,
        servicioId: servicio.id,
        fechaHora: new Date(),
        createdById: fx.userId,
      },
    })

    await bulkServicios(prisma, fx.consultorioId, fx.userId, []) // el usuario deselecciona todo

    const sigueExistiendo = await prisma.servicioMedico.findUnique({ where: { id: servicio.id } })
    expect(sigueExistiendo).not.toBeNull()
  })
})
