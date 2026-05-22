import type { IMedicoRepository } from "../../domain/ports/IMedicoRepository.js"
import type { MedicoEntity, MedicoRaw } from "../../domain/medico.entity.js"
import { MedicoTieneCitasPendientes } from "../../domain/consultorio.errors.js"

export class ActualizarMedicoUseCase {
  constructor(private readonly repo: IMedicoRepository) {}

  async ejecutar(id: string, data: Partial<MedicoRaw>, userId: string, consultorioId: string): Promise<MedicoEntity> {
    if (data.estado === "INACTIVO") {
      const tienePendientes = await this.repo.tieneCitasPendientes(id)
      if (tienePendientes) throw new MedicoTieneCitasPendientes()
    }
    return this.repo.actualizar(id, data, userId)
  }
}
