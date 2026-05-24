import type { IHistoriaClinicaRepository, HistoriaCreateDTO, AdjuntoDTO, ExtensionTipo } from "../domain/ports/IHistoriaClinicaRepository.js"
import type { ListResult } from "../domain/ports/IMedicoRepository.js"
import { HistoriaClinicaEntity, type HistoriaClinicaRaw, type AdjuntoClinicoRaw } from "../domain/historia-clinica.entity.js"
import { HistoriaNoEncontrada } from "../domain/consultorio.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { withAudit } from "../../../core/prisma-scoped.js"
import type { AuditoriaAccesoPrismaRepository } from "./auditoria-acceso.prisma.repository.js"

const EXTENSION_INCLUDE = {
  hcOdontologia: true,
  hcPediatria: true,
  hcGeneral: true,
  hcPerinatal: true,
  adjuntos: true,
}

export class HistoriaClinicaPrismaRepository implements IHistoriaClinicaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(
    private readonly db: any,
    private readonly auditoriaRepo?: AuditoriaAccesoPrismaRepository,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async crear(data: HistoriaCreateDTO, consultorioId: string, userId: string): Promise<HistoriaClinicaEntity> {
    const raw = await this.client.historiaClinica.create({
      data: withAudit({ consultorioId, ...data }, userId),
      include: EXTENSION_INCLUDE,
    })
    return HistoriaClinicaEntity.fromPrisma(raw as HistoriaClinicaRaw)
  }

  async obtener(id: string, consultorioId: string, userId?: string, tenantId?: string): Promise<HistoriaClinicaEntity> {
    const raw = await this.client.historiaClinica.findFirst({
      where: { id, consultorioId },
      include: EXTENSION_INCLUDE,
    })
    if (!raw) throw new HistoriaNoEncontrada(id)
    if (this.auditoriaRepo && userId && tenantId) {
      void this.auditoriaRepo.registrar({
        tenantId,
        consultorioId,
        userId,
        accion: "LEER_HISTORIA",
        recursoTipo: "HISTORIA_CLINICA",
        recursoId: id,
      })
    }
    return HistoriaClinicaEntity.fromPrisma(raw as HistoriaClinicaRaw)
  }

  async listar(consultorioId: string, params: QueryParams): Promise<ListResult<HistoriaClinicaEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["motivoConsulta", "diagnostico"])
    const where = { consultorioId, ...whereSearch }
    const [items, total] = await Promise.all([
      this.client.historiaClinica.findMany({ where, take, skip, orderBy, include: EXTENSION_INCLUDE }),
      this.client.historiaClinica.count({ where }),
    ])
    return { data: items.map((r: HistoriaClinicaRaw) => HistoriaClinicaEntity.fromPrisma(r)), total }
  }

  async actualizar(id: string, data: Partial<HistoriaCreateDTO>, userId: string): Promise<HistoriaClinicaEntity> {
    const raw = await this.client.historiaClinica.update({
      where: { id },
      data: { ...data, updatedById: userId },
      include: EXTENSION_INCLUDE,
    })
    return HistoriaClinicaEntity.fromPrisma(raw as HistoriaClinicaRaw)
  }

  async upsertExtension(historiaId: string, tipo: ExtensionTipo, data: Record<string, unknown>): Promise<void> {
    const where = { historiaId }
    const create = { historiaId, ...data }
    const update = data

    switch (tipo) {
      case "odontologia":
        await this.client.hcOdontologia.upsert({ where, create, update })
        break
      case "pediatria":
        await this.client.hcPediatria.upsert({ where, create, update })
        break
      case "general":
        await this.client.hcGeneral.upsert({ where, create, update })
        break
      case "perinatal":
        await this.client.hcPerinatal.upsert({ where, create, update })
        break
    }
  }

  async agregarAdjunto(historiaId: string, data: AdjuntoDTO): Promise<AdjuntoClinicoRaw> {
    return this.client.adjuntoClinico.create({ data: { historiaId, ...data } })
  }

  async agregarControlPerinatal(perinatalId: string, data: Record<string, unknown>): Promise<void> {
    await this.client.hcPerinatalControl.create({ data: { perinatalId, ...data } })
  }
}
