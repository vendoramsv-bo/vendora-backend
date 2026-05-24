import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

export interface AuditoriaRegistrarParams {
  tenantId: string
  consultorioId: string
  userId: string
  accion: string
  recursoTipo: string
  recursoId: string
  ip?: string
}

export interface AuditoriaAccesoRow {
  id: string
  tenantId: string
  consultorioId: string
  userId: string
  accion: string
  recursoTipo: string
  recursoId: string
  ip: string | null
  timestamp: Date
}

export class AuditoriaAccesoPrismaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  registrar(params: AuditoriaRegistrarParams): void {
    this.client.auditoriaAcceso
      .create({
        data: {
          tenantId: params.tenantId,
          consultorioId: params.consultorioId,
          userId: params.userId,
          accion: params.accion,
          recursoTipo: params.recursoTipo,
          recursoId: params.recursoId,
          ip: params.ip ?? null,
        },
      })
      .catch(() => {})
  }

  async listar(consultorioId: string, params: QueryParams): Promise<{ data: AuditoriaAccesoRow[]; total: number }> {
    const { take, skip, orderBy } = toPrismaArgs(params, ["accion", "recursoTipo"])
    const where = { consultorioId }
    const [items, total] = await Promise.all([
      this.client.auditoriaAcceso.findMany({ where, take, skip, orderBy: orderBy ?? { timestamp: "desc" } }),
      this.client.auditoriaAcceso.count({ where }),
    ])
    return { data: items as AuditoriaAccesoRow[], total }
  }
}
