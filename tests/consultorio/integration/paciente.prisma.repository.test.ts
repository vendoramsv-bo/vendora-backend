/**
 * Integration tests for PacientePrismaRepository.
 *
 * Requirements to run:
 *   - DATABASE_URL env var pointing to a Postgres DB with the consultorio schema migrated
 *   - Run: npx prisma migrate dev --name add-paciente-dni-canal-auditoria-acceso
 *     (adds dni, canalNotificacion columns and @@unique([consultorioId, dni]) to Paciente)
 *
 * Skip gracefully when DATABASE_URL is absent (unit CI).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "../../../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { PacientePrismaRepository } from "../../../src/modules/consultorio/infrastructure/paciente.prisma.repository.js"
import { DNIYaRegistrado } from "../../../src/modules/consultorio/domain/consultorio.errors.js"

const hasDb = !!process.env.DATABASE_URL

const RUN = `pac-int-${Date.now()}`
const CONSULTORIO_ID = `c-${RUN}`
const USER_ID = `u-${RUN}`

let prisma: PrismaClient
let repo: PacientePrismaRepository

describe.skipIf(!hasDb)("PacientePrismaRepository — integration", () => {
  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new PacientePrismaRepository(prisma as any)

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
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).paciente.deleteMany({ where: { consultorioId: CONSULTORIO_ID } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).consultorio.deleteMany({ where: { id: CONSULTORIO_ID } })
    } catch {
      // best-effort cleanup
    }
    await prisma.$disconnect()
  })

  describe("DNI — restricción de unicidad", () => {
    it("crea paciente con DNI único sin error", async () => {
      const p = await repo.crear({ nombre: "Ana", apellido: "Lopez", dni: `DNI-${RUN}-A` }, CONSULTORIO_ID, USER_ID)
      expect(p.dni).toBe(`DNI-${RUN}-A`)
    })

    it("lanza DNIYaRegistrado al insertar segundo paciente con mismo DNI en el mismo consultorio", async () => {
      const dni = `DNI-${RUN}-DUP`
      await repo.crear({ nombre: "Pedro", apellido: "Gomez", dni }, CONSULTORIO_ID, USER_ID)
      await expect(
        repo.crear({ nombre: "Maria", apellido: "Sosa", dni }, CONSULTORIO_ID, USER_ID),
      ).rejects.toThrow(DNIYaRegistrado)
    })

    it("permite el mismo DNI en distintos consultorios", async () => {
      const dni = `DNI-${RUN}-XCONS`
      const otroConsultorioId = `c2-${RUN}`
      await repo.crear({ nombre: "Carlos", apellido: "Ruiz", dni }, CONSULTORIO_ID, USER_ID)
      // Insert into a different consultorioId — should not conflict
      const p2 = await repo.crear({ nombre: "Luis", apellido: "Vera", dni }, otroConsultorioId, USER_ID)
      expect(p2.dni).toBe(dni)
      // Cleanup extra consultorio paciente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).paciente.deleteMany({ where: { consultorioId: otroConsultorioId } })
    })
  })

  describe("canalNotificacion — persistencia", () => {
    it("persiste y recupera canalNotificacion EMAIL", async () => {
      const p = await repo.crear(
        { nombre: "Lucia", apellido: "Flores", canalNotificacion: "EMAIL" },
        CONSULTORIO_ID,
        USER_ID,
      )
      expect(p.canalNotificacion).toBe("EMAIL")

      const retrieved = await repo.obtener(p.id, CONSULTORIO_ID)
      expect(retrieved.canalNotificacion).toBe("EMAIL")
    })

    it("persiste canalNotificacion null (sin preferencia)", async () => {
      const p = await repo.crear({ nombre: "Jorge", apellido: "Paz" }, CONSULTORIO_ID, USER_ID)
      expect(p.canalNotificacion).toBeNull()
    })

    it("actualiza canalNotificacion de null a WHATSAPP", async () => {
      const p = await repo.crear({ nombre: "Rosa", apellido: "Diaz" }, CONSULTORIO_ID, USER_ID)
      const updated = await repo.actualizar(p.id, { canalNotificacion: "WHATSAPP" }, USER_ID)
      expect(updated.canalNotificacion).toBe("WHATSAPP")
    })
  })

  describe("existeDni", () => {
    it("devuelve false cuando no existe ningún paciente con ese DNI", async () => {
      const result = await repo.existeDni(CONSULTORIO_ID, `DNI-${RUN}-NOEXISTE`)
      expect(result).toBe(false)
    })

    it("devuelve true cuando existe paciente con ese DNI", async () => {
      const dni = `DNI-${RUN}-EXISTS`
      await repo.crear({ nombre: "Test", apellido: "Existe", dni }, CONSULTORIO_ID, USER_ID)
      const result = await repo.existeDni(CONSULTORIO_ID, dni)
      expect(result).toBe(true)
    })

    it("devuelve false para el propio registro cuando se pasa excludeId (update self)", async () => {
      const dni = `DNI-${RUN}-SELF`
      const p = await repo.crear({ nombre: "Test", apellido: "Self", dni }, CONSULTORIO_ID, USER_ID)
      // Checking for same DNI but excluding own id → should be false (no OTHER record has this DNI)
      const result = await repo.existeDni(CONSULTORIO_ID, dni, p.id)
      expect(result).toBe(false)
    })

    it("devuelve true cuando otro paciente tiene ese DNI (update with conflict)", async () => {
      const dni = `DNI-${RUN}-OTHER`
      await repo.crear({ nombre: "Otro", apellido: "Paciente", dni }, CONSULTORIO_ID, USER_ID)
      const me = await repo.crear({ nombre: "Yo", apellido: "Mismo" }, CONSULTORIO_ID, USER_ID)
      // Trying to update "me" with dni already owned by "otro"
      const result = await repo.existeDni(CONSULTORIO_ID, dni, me.id)
      expect(result).toBe(true)
    })
  })
})
