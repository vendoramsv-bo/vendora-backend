import type { IPuntoVentaRepository, PuntoVentaData, CrearPuntoVentaDTO } from "../../domain/ports/IPuntoVentaRepository.js"
import { PuntoVentaNombreDuplicadoError } from "../../domain/ventas.errors.js"

export interface CrearPuntoVentaInput {
  tenantId: string
  nombre: string
  tipo?: string
  direccion?: string | null
  telefono?: string | null
  sucursal?: string | null
  createdById?: string | null
}

export class CrearPuntoVentaUseCase {
  constructor(private readonly repo: IPuntoVentaRepository) {}

  async execute(input: CrearPuntoVentaInput): Promise<PuntoVentaData> {
    try {
      return await this.repo.crear({
        tenantId: input.tenantId,
        nombre: input.nombre,
        tipo: input.tipo,
        direccion: input.direccion ?? null,
        telefono: input.telefono ?? null,
        sucursal: input.sucursal ?? null,
        createdById: input.createdById ?? null,
      } satisfies CrearPuntoVentaDTO)
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
