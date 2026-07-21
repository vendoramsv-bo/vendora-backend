/**
 * Integration test — extensión de GET /api/tenant/config para exponer
 * seguros/especialidades (Consultorio) y tiposCocina/zonas (Restaurante),
 * necesarios para que el wizard reconstruya esos pasos BULK al regresar a ellos
 * (specs/018-estandarizar-bulk-wizard, FR-007).
 *
 * Réplica de la resolución de datos que hace el handler GET /config en
 * wizard.rest.ts, contra datos reales.
 *
 * Requiere DATABASE_URL. Skip gracefully cuando no está presente.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "../../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { crearFixturesCompartidas, limpiarFixturesCompartidas, type WizardBulkFixtures } from "../helpers/wizard-bulk-fixtures.js"

const hasDb = !!process.env.DATABASE_URL
const RUN = `wbcfg${Date.now()}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any
let fx: WizardBulkFixtures

// Réplica de la resolución de consultorio/restaurante del handler GET /config (wizard.rest.ts)
async function resolverListasConfig(db: typeof prisma, tenantId: string) {
  const [consultorio, restaurante] = await Promise.all([
    db.consultorio.findUnique({ where: { tenantId }, select: { especialidades: true, contactoPublico: true } }),
    db.restaurante.findUnique({ where: { tenantId }, select: { contactoPublico: true } }),
  ])
  const consultorioContacto = (consultorio?.contactoPublico as Record<string, unknown> | null) ?? {}
  const restauranteContacto = (restaurante?.contactoPublico as Record<string, unknown> | null) ?? {}
  return {
    consultorio: consultorio
      ? { seguros: consultorioContacto.seguros ?? [], especialidades: consultorio.especialidades ?? [] }
      : null,
    restaurante: restaurante
      ? { tiposCocina: restauranteContacto.tiposCocina ?? [], zonas: restauranteContacto.zonas ?? [] }
      : null,
  }
}

describe.skipIf(!hasDb)("wizard GET /config — listas de consultorio/restaurante", () => {
  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
    fx = await crearFixturesCompartidas(prisma, RUN)
  })

  afterAll(async () => {
    await prisma.restaurante.deleteMany({ where: { tenantId: fx.tenantId } })
    await limpiarFixturesCompartidas(prisma, RUN)
    await prisma.$disconnect()
  })

  it("refleja seguros/especialidades guardados por sus respectivos pasos BULK", async () => {
    await prisma.consultorio.update({
      where: { tenantId: fx.tenantId },
      data: { contactoPublico: { seguros: ["SEGURO_A", "SEGURO_B"] }, especialidades: ["ODONTOLOGIA"] },
    })

    const listas = await resolverListasConfig(prisma, fx.tenantId)
    expect(listas.consultorio).toEqual({ seguros: ["SEGURO_A", "SEGURO_B"], especialidades: ["ODONTOLOGIA"] })
  })

  it("refleja tiposCocina/zonas guardados por sus respectivos pasos BULK", async () => {
    await prisma.restaurante.create({
      data: {
        tenantId: fx.tenantId,
        contactoPublico: { tiposCocina: ["ITALIANA"], zonas: [{ nombre: "Salon", mesas: [{ numero: 1 }] }] },
      },
    })

    const listas = await resolverListasConfig(prisma, fx.tenantId)
    expect(listas.restaurante).toEqual({ tiposCocina: ["ITALIANA"], zonas: [{ nombre: "Salon", mesas: [{ numero: 1 }] }] })
  })
})
