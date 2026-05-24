import { describe, it, expect, beforeEach } from "vitest"
import { CrearPacienteUseCase } from "../../src/modules/consultorio/application/paciente/crear-paciente.usecase.js"
import { DNIYaRegistrado } from "../../src/modules/consultorio/domain/consultorio.errors.js"
import { PacienteEntity, type PacienteRaw } from "../../src/modules/consultorio/domain/paciente.entity.js"
import type { IPacienteRepository, PacienteCreateDTO, VacunacionDTO, Vacunacion } from "../../src/modules/consultorio/domain/ports/IPacienteRepository.js"
import type { ListResult } from "../../src/modules/consultorio/domain/ports/IMedicoRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"

const CONSULTORIO = "c1"
const USER = "u1"

function makePacienteRaw(overrides: Partial<PacienteRaw> = {}): PacienteRaw {
  return {
    id: `p-${Date.now()}`,
    consultorioId: CONSULTORIO,
    dni: null,
    nombre: "Ana",
    apellido: "Lopez",
    fechaNacimiento: null,
    genero: null,
    telefono: null,
    email: null,
    direccion: null,
    tipoSangre: null,
    alergias: null,
    seguroNombre: null,
    seguroNumero: null,
    canalNotificacion: null,
    estado: "ACTIVO",
    createdAt: new Date(),
    updatedAt: null,
    createdById: null,
    updatedById: null,
    ...overrides,
  }
}

class FakePacienteRepository implements IPacienteRepository {
  private store = new Map<string, PacienteRaw>()
  private dniIndex = new Map<string, string>() // consultorioId:dni → pacienteId
  private nextId = 1

  seed(raw: PacienteRaw): void {
    this.store.set(raw.id, raw)
    if (raw.dni) this.dniIndex.set(`${raw.consultorioId}:${raw.dni}`, raw.id)
  }

  async crear(data: PacienteCreateDTO, consultorioId: string, _userId: string): Promise<PacienteEntity> {
    const raw = makePacienteRaw({ id: `p-${this.nextId++}`, consultorioId, ...data as Partial<PacienteRaw> })
    this.store.set(raw.id, raw)
    if (raw.dni) this.dniIndex.set(`${consultorioId}:${raw.dni}`, raw.id)
    return PacienteEntity.fromPrisma(raw)
  }

  async obtener(id: string, _consultorioId: string): Promise<PacienteEntity> {
    const raw = this.store.get(id)
    if (!raw) throw new Error(`Paciente ${id} no encontrado`)
    return PacienteEntity.fromPrisma(raw)
  }

  async listar(_cId: string, _params: QueryParams): Promise<ListResult<PacienteEntity>> {
    return { data: [], total: 0 }
  }

  async actualizar(id: string, data: Partial<PacienteRaw>, _userId: string): Promise<PacienteEntity> {
    const raw = { ...this.store.get(id)!, ...data }
    this.store.set(id, raw)
    return PacienteEntity.fromPrisma(raw)
  }

  async existeDni(consultorioId: string, dni: string, excludeId?: string): Promise<boolean> {
    const key = `${consultorioId}:${dni}`
    const existingId = this.dniIndex.get(key)
    if (!existingId) return false
    if (excludeId && existingId === excludeId) return false
    return true
  }

  async registrarVacunacion(_pacienteId: string, _data: VacunacionDTO): Promise<Vacunacion> {
    throw new Error("not implemented")
  }

  async listarVacunaciones(_pacienteId: string): Promise<Vacunacion[]> {
    return []
  }
}

describe("CrearPacienteUseCase", () => {
  let repo: FakePacienteRepository
  let useCase: CrearPacienteUseCase

  beforeEach(() => {
    repo = new FakePacienteRepository()
    useCase = new CrearPacienteUseCase(repo)
  })

  it("crea paciente sin DNI sin verificar unicidad", async () => {
    const p = await useCase.ejecutar({ nombre: "Ana", apellido: "Lopez" }, CONSULTORIO, USER)
    expect(p.nombre).toBe("Ana")
    expect(p.dni).toBeNull()
  })

  it("crea paciente con DNI único", async () => {
    const p = await useCase.ejecutar({ nombre: "Ana", apellido: "Lopez", dni: "12345678" }, CONSULTORIO, USER)
    expect(p.dni).toBe("12345678")
  })

  it("lanza DNIYaRegistrado cuando DNI ya existe en el consultorio", async () => {
    repo.seed(makePacienteRaw({ id: "p-existing", dni: "12345678", consultorioId: CONSULTORIO }))
    await expect(
      useCase.ejecutar({ nombre: "Juan", apellido: "Perez", dni: "12345678" }, CONSULTORIO, USER),
    ).rejects.toThrow(DNIYaRegistrado)
  })

  it("permite el mismo DNI en distintos consultorios", async () => {
    repo.seed(makePacienteRaw({ id: "p-other", dni: "12345678", consultorioId: "c-other" }))
    const p = await useCase.ejecutar({ nombre: "Ana", apellido: "Lopez", dni: "12345678" }, CONSULTORIO, USER)
    expect(p.dni).toBe("12345678")
  })

  it("crea paciente con canalNotificacion", async () => {
    const p = await useCase.ejecutar(
      { nombre: "Ana", apellido: "Lopez", canalNotificacion: "EMAIL" },
      CONSULTORIO,
      USER,
    )
    expect(p.canalNotificacion).toBe("EMAIL")
  })
})
