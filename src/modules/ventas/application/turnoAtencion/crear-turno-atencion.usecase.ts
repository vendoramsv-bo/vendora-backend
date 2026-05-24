import type { ITurnoAtencionRepository, TurnoAtencionData } from "../../domain/ports/ITurnoAtencionRepository.js"
import { TurnoNombreDuplicadoError } from "../../domain/ventas.errors.js"

export interface CrearTurnoAtencionInput {
  tenantId: string
  turno: string
  descripcion?: string | null
  createdById?: string | null
}

export class CrearTurnoAtencionUseCase {
  constructor(private readonly repo: ITurnoAtencionRepository) {}

  async execute(input: CrearTurnoAtencionInput): Promise<TurnoAtencionData> {
    try {
      return await this.repo.crear({
        tenantId: input.tenantId,
        turno: input.turno,
        descripcion: input.descripcion ?? null,
        createdById: input.createdById ?? null,
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
