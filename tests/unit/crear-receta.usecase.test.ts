import { describe, it, expect, beforeEach } from "vitest"
import { CrearRecetaUseCase } from "../../src/modules/consultorio/application/receta-medica/crear-receta.usecase.js"
import { RecetaMedicaEntity, type RecetaMedicaRaw } from "../../src/modules/consultorio/domain/receta-medica.entity.js"
import type { IRecetaMedicaRepository, RecetaCreateDTO } from "../../src/modules/consultorio/domain/ports/IRecetaMedicaRepository.js"
import type { ListResult } from "../../src/modules/consultorio/domain/ports/IMedicoRepository.js"
import { FakeConsultorioNotificador } from "../helpers/fake-consultorio.notificador.js"
import type { QueryParams } from "../../src/core/query-params.js"

const CONSULTORIO = "c1"
const TENANT = "t1"
const USER = "u1"
const YEAR = new Date().getFullYear()

class FakeRecetaRepository implements IRecetaMedicaRepository {
  private store = new Map<string, RecetaMedicaRaw>()
  private nextId = 1

  async ultimaReceta(consultorioId: string): Promise<{ numeroReceta: string } | null> {
    const items = Array.from(this.store.values()).filter((r) => r.consultorioId === consultorioId)
    if (items.length === 0) return null
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return { numeroReceta: items[0]!.numeroReceta }
  }

  async crear(data: RecetaCreateDTO, consultorioId: string, userId: string): Promise<RecetaMedicaEntity> {
    const ultima = await this.ultimaReceta(consultorioId)
    const year = new Date().getFullYear()
    let seq = 1
    if (ultima) {
      const parts = ultima.numeroReceta.split("-")
      const lastYear = parseInt(parts[1] ?? "0", 10)
      const lastSeq = parseInt(parts[2] ?? "0", 10)
      seq = lastYear === year ? lastSeq + 1 : 1
    }
    const numeroReceta = `REC-${year}-${String(seq).padStart(5, "0")}`

    const id = `receta-${this.nextId++}`
    const raw: RecetaMedicaRaw = {
      id, consultorioId, atencionId: data.atencionId, pacienteId: data.pacienteId,
      medicoId: data.medicoId, numeroReceta,
      pacienteNombre: "Test", pacienteApellido: "Paciente",
      medicoNombre: "Dr. Test", medicoEspecialidad: "GP", medicoRegistro: null,
      indicacionesGenerales: data.indicacionesGenerales ?? null,
      diagnosticoCie10: data.diagnosticoCie10 ?? null,
      fechaEmision: new Date(),
      fechaVencimiento: data.fechaVencimiento ?? new Date(Date.now() + 30 * 24 * 60 * 60_000),
      estado: "EMITIDA",
      observaciones: data.observaciones ?? null,
      createdAt: new Date(), updatedAt: null, createdById: userId, updatedById: null,
      detalle: [],
    }
    this.store.set(id, raw)
    return RecetaMedicaEntity.fromPrisma(raw)
  }

  async obtener(id: string, _cId: string): Promise<RecetaMedicaEntity> {
    const raw = this.store.get(id)
    if (!raw) throw new Error("not found")
    return RecetaMedicaEntity.fromPrisma(raw)
  }

  async listar(_cId: string, _params: QueryParams): Promise<ListResult<RecetaMedicaEntity>> {
    throw new Error("not implemented")
  }

  async anular(id: string, userId: string): Promise<RecetaMedicaEntity> {
    const raw = this.store.get(id)!
    const updated = { ...raw, estado: "ANULADA", updatedById: userId }
    this.store.set(id, updated)
    return RecetaMedicaEntity.fromPrisma(updated)
  }
}

const baseData: RecetaCreateDTO = {
  atencionId: "at-1",
  pacienteId: "p1",
  medicoId: "m1",
  detalle: [],
}

describe("CrearRecetaUseCase", () => {
  let repo: FakeRecetaRepository
  let notificador: FakeConsultorioNotificador
  let useCase: CrearRecetaUseCase

  beforeEach(() => {
    repo = new FakeRecetaRepository()
    notificador = new FakeConsultorioNotificador()
    useCase = new CrearRecetaUseCase(repo, notificador)
  })

  it(`primera receta → "REC-${YEAR}-00001"`, async () => {
    const receta = await useCase.ejecutar(baseData, CONSULTORIO, USER, TENANT)
    expect(receta.numeroReceta).toBe(`REC-${YEAR}-00001`)
  })

  it(`segunda receta → "REC-${YEAR}-00002"`, async () => {
    await useCase.ejecutar(baseData, CONSULTORIO, USER, TENANT)
    const receta2 = await useCase.ejecutar(baseData, CONSULTORIO, USER, TENANT)
    expect(receta2.numeroReceta).toBe(`REC-${YEAR}-00002`)
  })

  it("evento consultorio:receta:emitida se emite al crear", async () => {
    await useCase.ejecutar(baseData, CONSULTORIO, USER, TENANT)
    expect(notificador.tieneEvento("consultorio:receta:emitida")).toBe(true)
  })

  it("diferentes consultorios tienen secuencias independientes", async () => {
    const r1 = await useCase.ejecutar(baseData, "cA", USER, TENANT)
    const r2 = await useCase.ejecutar(baseData, "cB", USER, TENANT)
    expect(r1.numeroReceta).toBe(`REC-${YEAR}-00001`)
    expect(r2.numeroReceta).toBe(`REC-${YEAR}-00001`)
  })
})
