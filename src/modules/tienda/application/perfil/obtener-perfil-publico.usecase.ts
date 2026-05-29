import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"
import { TiendaNoEncontradaError } from "../../domain/tienda.errors.js"

export class ObtenerPerfilPublicoUseCase {
  constructor(private readonly repo: ITiendaRepository) {}

  async execute(slug: string) {
    const perfil = await this.repo.obtenerPerfilPublico(slug)
    if (!perfil) throw new TiendaNoEncontradaError(slug)
    return perfil
  }
}
