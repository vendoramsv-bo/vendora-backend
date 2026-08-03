import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"

/**
 * Productos del comercio que mas personas guardaron (spec 019 FR-024).
 *
 * Alimenta la seccion "Productos favoritos de nuestros usuarios". Devuelve lista
 * vacia si nadie guardo nada todavia, y la vitrina omite la seccion entera en vez
 * de mostrar un hueco.
 */
export class ListarFavoritosComunidadUseCase {
  constructor(private readonly repo: ITiendaRepository) {}

  async execute(slug: string) {
    return this.repo.listarFavoritosComunidad(slug)
  }
}
