import { describe, it, expect, beforeEach } from "vitest"
import { ConfirmarCitaUseCase } from "../../src/modules/consultorio/application/cita/confirmar-cita.usecase.js"
import { ConflictoVersionError, CitaNoConfirmable, CitaYaAtendida } from "../../src/modules/consultorio/domain/consultorio.errors.js"
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
    id: "cita-1",
    consultorioId: CONSULTORIO,
    pacienteId: PACIENTE,
    medicoId: MEDICO,
    servicioId: null,
    fechaHora: new Date(Date.now() + 86_400_000), // mañana
    duracionMin: 30,
    estado: "PENDIENTE",
    motivo: null,
    canalOrigen: null,
    notas: null,
    createdAt: new Date(),
    updatedAt: new Date("2026-06-01T10:00:00Z"),
    createdById: null,
    updatedById: null,
    ...overrides,
  }
}

describe("ConfirmarCitaUseCase — bloqueo optimista", () => {
  let repo: FakeCitaRepository
  let notificador: FakeConsultorioNotificador
  let useCase: ConfirmarCitaUseCase

  beforeEach(() => {
    repo = new FakeCitaRepository()
    notificador = new FakeConsultorioNotificador()
    useCase = new ConfirmarCitaUseCase(repo, notificador)
  })

  it("confirma cita cuando expectedUpdatedAt coincide", async () => {
    const raw = citaRaw()
    repo.seed(raw)
    const result = await useCase.ejecutar("cita-1", CONSULTORIO, USER, TENANT, new Date("2026-06-01T10:00:00Z"))
    expect(result.estado).toBe("ACEPTADO")
    expect(notificador.tieneEvento("consultorio:cita:estadoCambiado")).toBe(true)
  })

  it("confirma cita sin expectedUpdatedAt (backward compatible)", async () => {
    repo.seed(citaRaw())
    const result = await useCase.ejecutar("cita-1", CONSULTORIO, USER, TENANT)
    expect(result.estado).toBe("ACEPTADO")
  })

  it("lanza ConflictoVersionError cuando expectedUpdatedAt no coincide", async () => {
    repo.seed(citaRaw())
    await expect(
      useCase.ejecutar("cita-1", CONSULTORIO, USER, TENANT, new Date("2025-01-01T00:00:00Z")),
    ).rejects.toThrow(ConflictoVersionError)
  })

  it("lanza CitaNoConfirmable cuando ya fue cancelada", async () => {
    repo.seed(citaRaw({ estado: "ELIMINADO" }))
    await expect(
      useCase.ejecutar("cita-1", CONSULTORIO, USER, TENANT),
    ).rejects.toThrow(CitaNoConfirmable)
  })

  it("lanza CitaNoConfirmable cuando ya fue atendida", async () => {
    repo.seed(citaRaw({ estado: "ATENDIDO" }))
    await expect(
      useCase.ejecutar("cita-1", CONSULTORIO, USER, TENANT),
    ).rejects.toThrow(CitaNoConfirmable)
  })

  it("no emite evento cuando hay ConflictoVersionError", async () => {
    repo.seed(citaRaw())
    await useCase.ejecutar("cita-1", CONSULTORIO, USER, TENANT, new Date("2025-01-01T00:00:00Z")).catch(() => {})
    expect(notificador.tieneEvento("consultorio:cita:estadoCambiado")).toBe(false)
  })
})

describe("ConfirmarCitaUseCase — sin bloqueo optimista (updatedAt null)", () => {
  it("confirma sin error cuando updatedAt es null y se pasa expectedUpdatedAt", async () => {
    const repo = new FakeCitaRepository()
    const notificador = new FakeConsultorioNotificador()
    const useCase = new ConfirmarCitaUseCase(repo, notificador)
    repo.seed(citaRaw({ updatedAt: null }))
    const result = await useCase.ejecutar("cita-1", CONSULTORIO, USER, TENANT, new Date("2026-06-01T10:00:00Z"))
    expect(result.estado).toBe("ACEPTADO")
  })
})
