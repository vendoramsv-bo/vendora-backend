import type { IConsultorioPublicoRepository, ConsultorioPublicoRaw } from "../../domain/ports/IConsultorioPublicoRepository.js"
import { ConsultorioNoEncontradoError } from "../../domain/consultorio-publico.errors.js"

export class ObtenerPerfilPublicoConsultorioUseCase {
  constructor(private readonly repo: IConsultorioPublicoRepository) {}

  async ejecutar(slug: string): Promise<ConsultorioPublicoRaw> {
    const perfil = await this.repo.obtenerPerfil(slug)
    if (!perfil) throw new ConsultorioNoEncontradoError(slug)
    return perfil
  }
}
