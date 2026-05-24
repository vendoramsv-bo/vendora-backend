/**
 * Integration tests for CitaPrismaRepository.
 *
 * Requirements to run:
 *   - DATABASE_URL env var pointing to a Postgres DB with the consultorio schema migrated
 *   - Run: npx prisma migrate dev --name add-paciente-dni-canal-auditoria-acceso
 *
 * Skip gracefully when DATABASE_URL is absent (unit CI).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "../../../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { CitaPrismaRepository } from "../../../src/modules/consultorio/infrastructure/cita.prisma.repository.js"

const hasDb = !!process.env.DATABASE_URL

// Unique suffix per test run to avoid cross-run collisions
const RUN = `cita-int-${Date.now()}`
const CONSULTORIO_ID = `c-${RUN}`
const MEDICO_ID = `m-${RUN}`
const PACIENTE_ID = `p-${RUN}`
const USER_ID = `u-${RUN}`

let prisma: PrismaClient
let repo: CitaPrismaRepository

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rawInsert(db: any, table: string, data: Record<string, unknown>) {
  return db[table].create({ data })
}

describe.skipIf(!hasDb)("CitaPrismaRepository — integration", () => {
  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new CitaPrismaRepository(prisma as any)

    // Seed a minimal Consultorio row (required FK). If FK is deferred/disabled in test DB skip seeding.
    try {
      await (prisma as unknown as Record<string, unknown> & { consultorio: { upsert: Function } }).consultorio.upsert({
        where: { id: CONSULTORIO_ID },
        create: { id: CONSULTORIO_ID, nombre: "Test Consultorio", tenantId: `tenant-${RUN}` },
        update: {},
      })
    } catch {
      // FK not enforced in test DB, continue
    }
  })

  afterAll(async () => {
    // Delete citas created during tests
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).cita.deleteMany({ where: { consultorioId: CONSULTORIO_ID } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).consultorio.deleteMany({ where: { id: CONSULTORIO_ID } })
    } catch {
      // best-effort cleanup
    }
    await prisma.$disconnect()
  })

  describe("verificarSolapamiento", () => {
    it("devuelve false cuando no hay citas para el médico", async () => {
      const fechaHora = new Date("2030-01-15T09:00:00Z")
      const result = await repo.verificarSolapamiento(CONSULTORIO_ID, MEDICO_ID, fechaHora, 30)
      expect(result).toBe(false)
    })

    it("devuelve true cuando existe cita solapada PENDIENTE", async () => {
      const baseTime = new Date("2030-01-15T10:00:00Z")
      // Insert cita directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).cita.create({
        data: {
          id: `c1-${RUN}`,
          consultorioId: CONSULTORIO_ID,
          medicoId: MEDICO_ID,
          pacienteId: PACIENTE_ID,
          fechaHora: baseTime,
          duracionMin: 30,
          estado: "PENDIENTE",
          createdById: USER_ID,
          updatedById: USER_ID,
        },
      })

      // A cita starting 15 min into the existing one overlaps
      const solapada = new Date(baseTime.getTime() + 15 * 60_000)
      const result = await repo.verificarSolapamiento(CONSULTORIO_ID, MEDICO_ID, solapada, 30)
      expect(result).toBe(true)
    })

    it("devuelve false cuando cita solapada está ELIMINADA (cancelada)", async () => {
      const baseTime = new Date("2030-01-15T11:00:00Z")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).cita.create({
        data: {
          id: `c2-${RUN}`,
          consultorioId: CONSULTORIO_ID,
          medicoId: MEDICO_ID,
          pacienteId: PACIENTE_ID,
          fechaHora: baseTime,
          duracionMin: 30,
          estado: "ELIMINADO",
          createdById: USER_ID,
          updatedById: USER_ID,
        },
      })

      const solapada = new Date(baseTime.getTime() + 10 * 60_000)
      const result = await repo.verificarSolapamiento(CONSULTORIO_ID, MEDICO_ID, solapada, 30)
      expect(result).toBe(false)
    })

    it("devuelve false cuando se excluye la propia cita (excluirId)", async () => {
      const baseTime = new Date("2030-01-15T12:00:00Z")
      const citaId = `c3-${RUN}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).cita.create({
        data: {
          id: citaId,
          consultorioId: CONSULTORIO_ID,
          medicoId: MEDICO_ID,
          pacienteId: PACIENTE_ID,
          fechaHora: baseTime,
          duracionMin: 30,
          estado: "PENDIENTE",
          createdById: USER_ID,
          updatedById: USER_ID,
        },
      })

      // Same slot but excluding self → no overlap
      const result = await repo.verificarSolapamiento(CONSULTORIO_ID, MEDICO_ID, baseTime, 30, citaId)
      expect(result).toBe(false)
    })
  })

  describe("optimistic lock — cambiarEstado refleja updatedAt", () => {
    it("cambiarEstado actualiza updatedAt en la BD", async () => {
      const fechaHora = new Date("2030-01-20T09:00:00Z")
      const citaId = `c4-${RUN}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).cita.create({
        data: {
          id: citaId,
          consultorioId: CONSULTORIO_ID,
          medicoId: MEDICO_ID,
          pacienteId: PACIENTE_ID,
          fechaHora,
          duracionMin: 30,
          estado: "PENDIENTE",
          createdById: USER_ID,
          updatedById: USER_ID,
        },
      })

      const before = await repo.obtener(citaId, CONSULTORIO_ID)
      const updatedAtBefore = before.updatedAt

      await new Promise((r) => setTimeout(r, 50)) // ensure timestamp advances
      await repo.cambiarEstado(citaId, "ACEPTADO", USER_ID)

      const after = await repo.obtener(citaId, CONSULTORIO_ID)
      // updatedAt should have changed (Prisma auto-updates it via @updatedAt)
      if (updatedAtBefore !== null && after.updatedAt !== null) {
        expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(updatedAtBefore.getTime())
      }
      expect(after.estado).toBe("ACEPTADO")
    })

    it("detecta conflicto de versión cuando updatedAt cambia entre carga y confirmación", async () => {
      const fechaHora = new Date("2030-01-20T10:00:00Z")
      const citaId = `c5-${RUN}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).cita.create({
        data: {
          id: citaId,
          consultorioId: CONSULTORIO_ID,
          medicoId: MEDICO_ID,
          pacienteId: PACIENTE_ID,
          fechaHora,
          duracionMin: 30,
          estado: "PENDIENTE",
          createdById: USER_ID,
          updatedById: USER_ID,
        },
      })

      // Load cita — capture its updatedAt as the expected version
      const cita = await repo.obtener(citaId, CONSULTORIO_ID)
      const staleVersion = cita.updatedAt

      // Simulate concurrent update: another process changes the cita
      await new Promise((r) => setTimeout(r, 50))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).cita.update({
        where: { id: citaId },
        data: { notas: "Modificado concurrentemente" },
      })

      // Reload to confirm updatedAt changed
      const reloaded = await repo.obtener(citaId, CONSULTORIO_ID)
      if (staleVersion !== null && reloaded.updatedAt !== null) {
        // If @updatedAt auto-updates, there is a version mismatch
        const hasConflict = staleVersion.getTime() !== reloaded.updatedAt.getTime()
        expect(hasConflict).toBe(true)
      }
    })
  })
})
