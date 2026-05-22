import type { IMedicoRepository, MedicoCreateDTO, HorarioCreateDTO, HorarioAtencion, ListResult } from "../../src/modules/consultorio/domain/ports/IMedicoRepository.js"
import { MedicoEntity, type MedicoRaw } from "../../src/modules/consultorio/domain/medico.entity.js"
import { MedicoNoEncontrado, HorarioDuplicado } from "../../src/modules/consultorio/domain/consultorio.errors.js"
import type { QueryParams } from "../../src/core/query-params.js"

export class FakeMedicoRepository implements IMedicoRepository {
  private medicos = new Map<string, MedicoRaw>()
  private horarios = new Map<string, HorarioAtencion>()
  private nextId = 1

  seed(raw: MedicoRaw): MedicoEntity {
    this.medicos.set(raw.id, raw)
    return MedicoEntity.fromPrisma(raw)
  }

  async crear(data: MedicoCreateDTO, userId: string): Promise<MedicoEntity> {
    const id = `medico-${this.nextId++}`
    const raw: MedicoRaw = {
      id, consultorioId: data.consultorioId ?? "c1", memberId: data.memberId,
      especialidad: data.especialidad, nroRegistro: data.nroRegistro ?? null,
      bio: data.bio ?? null, fotoUrl: data.fotoUrl ?? null, estado: "ACTIVO",
      createdAt: new Date(), updatedAt: null, createdById: userId, updatedById: null,
      horariosAtencion: [],
    }
    this.medicos.set(id, raw)
    return MedicoEntity.fromPrisma(raw)
  }

  async obtener(id: string, consultorioId: string): Promise<MedicoEntity> {
    const raw = this.medicos.get(id)
    if (!raw || raw.consultorioId !== consultorioId) throw new MedicoNoEncontrado(id)
    return MedicoEntity.fromPrisma({ ...raw, horariosAtencion: this._horariosDemedico(id) })
  }

  async listar(consultorioId: string, params: QueryParams): Promise<ListResult<MedicoEntity>> {
    const items = Array.from(this.medicos.values()).filter((m) => m.consultorioId === consultorioId)
    const sliced = items.slice(params.skip, params.skip + params.take)
    return { data: sliced.map((r) => MedicoEntity.fromPrisma(r)), total: items.length }
  }

  async actualizar(id: string, data: Partial<MedicoRaw>, _userId: string): Promise<MedicoEntity> {
    const raw = this.medicos.get(id)
    if (!raw) throw new MedicoNoEncontrado(id)
    const updated = { ...raw, ...data }
    this.medicos.set(id, updated)
    return MedicoEntity.fromPrisma(updated)
  }

  async buscarPorMiembro(memberId: string, consultorioId: string): Promise<MedicoEntity | null> {
    const found = Array.from(this.medicos.values()).find((m) => m.memberId === memberId && m.consultorioId === consultorioId)
    return found ? MedicoEntity.fromPrisma(found) : null
  }

  async agregarHorario(medicoId: string, data: HorarioCreateDTO): Promise<HorarioAtencion> {
    const duplicate = Array.from(this.horarios.values()).find(
      (h) => h.medicoId === medicoId && h.diaSemana === data.diaSemana && h.horaInicio === data.horaInicio,
    )
    if (duplicate) throw new HorarioDuplicado()
    const id = `horario-${this.nextId++}`
    const h: HorarioAtencion = { id, medicoId, ...data, activo: true, createdAt: new Date() }
    this.horarios.set(id, h)
    return h
  }

  async eliminarHorario(horarioId: string, _medicoId: string): Promise<void> {
    this.horarios.delete(horarioId)
  }

  async listarHorarios(medicoId: string): Promise<HorarioAtencion[]> {
    return Array.from(this.horarios.values()).filter((h) => h.medicoId === medicoId)
  }

  async tieneCitasPendientes(_id: string): Promise<boolean> {
    return false
  }

  private _horariosDemedico(medicoId: string): HorarioAtencion[] {
    return Array.from(this.horarios.values()).filter((h) => h.medicoId === medicoId)
  }
}
