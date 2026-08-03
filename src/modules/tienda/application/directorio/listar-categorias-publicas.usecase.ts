import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"

/**
 * Categorias que el comercio usa en su catalogo publico (spec 019 FR-001).
 *
 * Alimentan la barra de navegacion de la vitrina. Un comercio que no resuelve
 * —inexistente o con la creacion incompleta— devuelve lista vacia, y la barra se
 * omite entera en vez de mostrar un error.
 */
export class ListarCategoriasPublicasUseCase {
  constructor(private readonly repo: ITiendaRepository) {}

  async execute(slug: string) {
    return this.repo.listarCategoriasPublicas(slug)
  }
}
