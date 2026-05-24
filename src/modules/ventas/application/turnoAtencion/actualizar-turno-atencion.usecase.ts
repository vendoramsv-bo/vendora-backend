import type { ITurnoAtencionRepository, TurnoAtencionData } from "../../domain/ports/ITurnoAtencionRepository.js"
import { TurnoNoEncontradoError, TurnoNombreDuplicadoError } from "../../domain/ventas.errors.js"

export interface ActualizarTurnoAtencionInput {
  id: string
  tenantId: string
  turno?: string
  descripcion?: string | null
  updatedById?: string | null
}

export class ActualizarTurnoAtencionUseCase {
  constructor(private readonly repo: ITurnoAtencionRepository) {}

  async execute(input: ActualizarTurnoAtencionInput): Promise<TurnoAtencionData> {
    const existing = await this.repo.obtener(input.id, input.tenantId)
    if (!existing) throw new TurnoNoEncontradoError(input.id)

    try {
      return await this.repo.actualizar(input.id, input.tenantId, {
        turno: input.turno,
        descripcion: input.descripcion,
        updatedById: input.updatedById ?? null,
      })
    } catch (err: unknown) {
      if (err instanceof TurnoNombreDuplicadoError) throw err
      if (isP2002(err)) throw new TurnoNombreDuplicadoError(input.turno)
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
