import type { IMedicoRepository, MedicoCreateDTO } from "../../domain/ports/IMedicoRepository.js"
import type { MedicoEntity } from "../../domain/medico.entity.js"
import { MedicoYaExiste } from "../../domain/consultorio.errors.js"

export class CrearMedicoUseCase {
  constructor(private readonly repo: IMedicoRepository) {}

  async ejecutar(data: MedicoCreateDTO, userId: string): Promise<MedicoEntity> {
    const existente = await this.repo.buscarPorMiembro(data.memberId, data.consultorioId)
    if (existente) throw new MedicoYaExiste()
    return this.repo.crear(data, userId)
  }
}
