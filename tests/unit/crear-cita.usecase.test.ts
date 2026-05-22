import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../../src/core/recordatorios.queue.js", () => ({
  recordatoriosQueue: { add: vi.fn().mockResolvedValue(undefined) },
}))

import { CrearCitaUseCase } from "../../src/modules/consultorio/application/cita/crear-cita.usecase.js"
import { CitaSolapada } from "../../src/modules/consultorio/domain/consultorio.errors.js"
import { FakeCitaRepository } from "../helpers/fake-cita.repository.js"
import { FakeConsultorioNotificador } from "../helpers/fake-consultorio.notificador.js"
import type { CitaRaw } from "../../src/modules/consultorio/domain/cita.entity.js"

const CONSULTORIO = "c1"
const MEDICO = "m1"
const PACIENTE = "p1"
const TENANT = "t1"
const USER = "u1"

function citaRaw(overrides: Partial<CitaRaw> = {}): CitaRaw {
  return {
    id: "cita-0",
    consultorioId: CONSULTORIO,
    pacienteId: PACIENTE,
    medicoId: MEDICO,
    servicioId: null,
    fechaHora: new Date("2026-06-01T10:00:00Z"),
    duracionMin: 30,
    estado: "PENDIENTE",
    motivo: null,
    canalOrigen: null,
    notas: null,
    createdAt: new Date(),
    updatedAt: null,
    createdById: null,
    updatedById: null,
    ...overrides,
  }
}

describe("CrearCitaUseCase", () => {
  let repo: FakeCitaRepository
  let notificador: FakeConsultorioNotificador
  let useCase: CrearCitaUseCase

  beforeEach(() => {
    repo = new FakeCitaRepository()
    notificador = new FakeConsultorioNotificador()
    useCase = new CrearCitaUseCase(repo, notificador)
  })

  it("crea cita cuando no hay solapamiento", async () => {
    const cita = await useCase.ejecutar(
      { pacienteId: PACIENTE, medicoId: MEDICO, fechaHora: new Date("2026-06-01T10:00:00Z"), duracionMin: 30 },
      CONSULTORIO, USER, TENANT,
    )
    expect(cita.estado).toBe("PENDIENTE")
    expect(notificador.tieneEvento("consultorio:cita:creada")).toBe(true)
  })

  it("lanza CitaSolapada cuando hay solapamiento exacto", async () => {
    repo.seed(citaRaw())
    await expect(
      useCase.ejecutar(
        { pacienteId: PACIENTE, medicoId: MEDICO, fechaHora: new Date("2026-06-01T10:00:00Z"), duracionMin: 30 },
        CONSULTORIO, USER, TENANT,
      ),
    ).rejects.toThrow(CitaSolapada)
  })

  it("lanza CitaSolapada en solapamiento parcial (nueva cita empieza dentro de la existente)", async () => {
    repo.seed(citaRaw()) // 10:00 - 10:30
    await expect(
      useCase.ejecutar(
        { pacienteId: PACIENTE, medicoId: MEDICO, fechaHora: new Date("2026-06-01T10:15:00Z"), duracionMin: 30 },
        CONSULTORIO, USER, TENANT,
      ),
    ).rejects.toThrow(CitaSolapada)
  })

  it("lanza CitaSolapada cuando la nueva cita envuelve a la existente", async () => {
    repo.seed(citaRaw()) // 10:00 - 10:30
    await expect(
      useCase.ejecutar(
        { pacienteId: PACIENTE, medicoId: MEDICO, fechaHora: new Date("2026-06-01T09:45:00Z"), duracionMin: 60 },
        CONSULTORIO, USER, TENANT,
      ),
    ).rejects.toThrow(CitaSolapada)
  })

  it("no lanza error para citas en distintos médicos", async () => {
    repo.seed(citaRaw({ medicoId: "m2" }))
    await expect(
      useCase.ejecutar(
        { pacienteId: PACIENTE, medicoId: MEDICO, fechaHora: new Date("2026-06-01T10:00:00Z"), duracionMin: 30 },
        CONSULTORIO, USER, TENANT,
      ),
    ).resolves.toBeDefined()
  })

  it("citas canceladas (ELIMINADO/RECHAZADO) no bloquean el agendamiento", async () => {
    repo.seed(citaRaw({ estado: "ELIMINADO" }))
    repo.seed(citaRaw({ id: "cita-0b", estado: "RECHAZADO" }))
    await expect(
      useCase.ejecutar(
        { pacienteId: PACIENTE, medicoId: MEDICO, fechaHora: new Date("2026-06-01T10:00:00Z"), duracionMin: 30 },
        CONSULTORIO, USER, TENANT,
      ),
    ).resolves.toBeDefined()
  })

  it("permite cita adyacente (justo después de otra)", async () => {
    repo.seed(citaRaw()) // 10:00 - 10:30
    await expect(
      useCase.ejecutar(
        { pacienteId: PACIENTE, medicoId: MEDICO, fechaHora: new Date("2026-06-01T10:30:00Z"), duracionMin: 30 },
        CONSULTORIO, USER, TENANT,
      ),
    ).resolves.toBeDefined()
  })
})
