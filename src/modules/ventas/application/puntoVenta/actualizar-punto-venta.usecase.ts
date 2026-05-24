import type { IPuntoVentaRepository, PuntoVentaData } from "../../domain/ports/IPuntoVentaRepository.js"
import { PuntoVentaNoEncontradoError, PuntoVentaNombreDuplicadoError } from "../../domain/ventas.errors.js"

export interface ActualizarPuntoVentaInput {
  id: string
  tenantId: string
  nombre?: string
  tipo?: string
  direccion?: string | null
  telefono?: string | null
  sucursal?: string | null
  updatedById?: string | null
}

export class ActualizarPuntoVentaUseCase {
  constructor(private readonly repo: IPuntoVentaRepository) {}

  async execute(input: ActualizarPuntoVentaInput): Promise<PuntoVentaData> {
    const existing = await this.repo.obtener(input.id, input.tenantId)
    if (!existing) throw new PuntoVentaNoEncontradoError(input.id)

    try {
      return await this.repo.actualizar(input.id, input.tenantId, {
        nombre: input.nombre,
        tipo: input.tipo,
        direccion: input.direccion,
        telefono: input.telefono,
        sucursal: input.sucursal,
        updatedById: input.updatedById ?? null,
      })
    } catch (err: unknown) {
      if (err instanceof PuntoVentaNombreDuplicadoError) throw err
      if (isP2002(err)) throw new PuntoVentaNombreDuplicadoError(input.nombre)
      throw err
    }
  }
}

function isP2002(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  )
}
