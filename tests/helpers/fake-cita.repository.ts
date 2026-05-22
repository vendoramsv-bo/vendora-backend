import type { ICitaRepository, CitaCreateDTO } from "../../src/modules/consultorio/domain/ports/ICitaRepository.js"
import type { ListResult } from "../../src/modules/consultorio/domain/ports/IMedicoRepository.js"
import { CitaEntity, type CitaRaw } from "../../src/modules/consultorio/domain/cita.entity.js"
import { CitaNoEncontrada } from "../../src/modules/consultorio/domain/consultorio.errors.js"
import type { QueryParams } from "../../src/core/query-params.js"

const ESTADOS_CANCELADOS = ["ELIMINADO", "RECHAZADO"]

export class FakeCitaRepository implements ICitaRepository {
  private citas = new Map<string, CitaRaw>()
  private nextId = 1

  seed(raw: CitaRaw): CitaEntity {
    this.citas.set(raw.id, raw)
    return CitaEntity.fromPrisma(raw)
  }

  async crear(data: CitaCreateDTO, consultorioId: string, userId: string): Promise<CitaEntity> {
    const id = `cita-${this.nextId++}`
    const raw: CitaRaw = {
      id, consultorioId, pacienteId: data.pacienteId, medicoId: data.medicoId,
      servicioId: data.servicioId ?? null, fechaHora: data.fechaHora,
      duracionMin: data.duracionMin ?? 30, estado: "PENDIENTE",
      motivo: data.motivo ?? null, canalOrigen: data.canalOrigen ?? null,
      notas: data.notas ?? null, createdAt: new Date(), updatedAt: null,
      createdById: userId, updatedById: null,
    }
    this.citas.set(id, raw)
    return CitaEntity.fromPrisma(raw)
  }

  async obtener(id: string, consultorioId: string): Promise<CitaEntity> {
    const raw = this.citas.get(id)
    if (!raw || raw.consultorioId !== consultorioId) throw new CitaNoEncontrada(id)
    return CitaEntity.fromPrisma(raw)
  }

  async listar(_consultorioId: string, params: QueryParams): Promise<ListResult<CitaEntity>> {
    const items = Array.from(this.citas.values())
    const sliced = items.slice(params.skip, params.skip + params.take)
    return { data: sliced.map((r) => CitaEntity.fromPrisma(r)), total: items.length }
  }

  async listarPorMedico(medicoId: string, consultorioId: string, params: QueryParams): Promise<ListResult<CitaEntity>> {
    const items = Array.from(this.citas.values()).filter((c) => c.medicoId === medicoId && c.consultorioId === consultorioId)
    const sliced = items.slice(params.skip, params.skip + params.take)
    return { data: sliced.map((r) => CitaEntity.fromPrisma(r)), total: items.length }
  }

  async cambiarEstado(id: string, estado: string, userId: string): Promise<CitaEntity> {
    const raw = this.citas.get(id)
    if (!raw) throw new CitaNoEncontrada(id)
    const updated = { ...raw, estado, updatedById: userId, updatedAt: new Date() }
    this.citas.set(id, updated)
    return CitaEntity.fromPrisma(updated)
  }

  // Same overlap logic as CitaPrismaRepository — in-memory version for tests
  async verificarSolapamiento(
    consultorioId: string,
    medicoId: string,
    fechaHora: Date,
    duracionMin: number,
    excluirId?: string,
  ): Promise<boolean> {
    const fin = new Date(fechaHora.getTime() + duracionMin * 60_000)
    return Array.from(this.citas.values()).some((c) => {
      if (c.consultorioId !== consultorioId || c.medicoId !== medicoId) return false
      if (ESTADOS_CANCELADOS.includes(c.estado)) return false
      if (excluirId && c.id === excluirId) return false
      const cFin = new Date(c.fechaHora.getTime() + c.duracionMin * 60_000)
      return fechaHora < cFin && fin > c.fechaHora
    })
  }
}
