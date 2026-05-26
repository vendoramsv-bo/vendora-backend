import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"

export class ListarValoracionesTiendaUseCase {
  constructor(private readonly repo: ITiendaSocialRepository) {}

  async ejecutar(slug: string, params: { take: number; skip: number; order: "asc" | "desc"; orderBy?: string }) {
    const tiendaId = await this.repo.resolveTiendaId(slug)
    const result = await this.repo.listarValoracionesTienda(tiendaId, params)
    const promedio = await this.repo.getPromedioValoracionesTienda(tiendaId)
    return { ...result, meta: { ...result, promedio } }
  }
}
