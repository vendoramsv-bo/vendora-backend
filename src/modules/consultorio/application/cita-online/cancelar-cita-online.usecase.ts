import type { IConsultorioPublicoRepository } from "../../domain/ports/IConsultorioPublicoRepository.js"
import { CitaNoCancelableError } from "../../domain/consultorio-publico.errors.js"

const CANCELABLES = new Set(["PENDIENTE", "CONFIRMADA"])

export class CancelarCitaOnlineUseCase {
  constructor(private readonly repo: IConsultorioPublicoRepository) {}

  async ejecutar(citaId: string, authenticatedUserId: string): Promise<{ id: string; estado: string }> {
    const cita = await this.repo.getCitaById(citaId)
    if (!cita || cita.consumerUserId !== authenticatedUserId) {
      const err = new Error("Cita no encontrada o sin permiso")
      Object.assign(err, { statusCode: 403 })
      throw err
    }
    if (!CANCELABLES.has(cita.estado)) throw new CitaNoCancelableError(cita.estado)

    const updated = await this.repo.cancelarCitaOnline(citaId, authenticatedUserId)
    return { id: updated.id, estado: updated.estado }
  }
}
