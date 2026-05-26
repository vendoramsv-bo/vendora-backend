import type { IPublicacionRepository } from "../../domain/ports/IPublicacionRepository.js"

export class ListarPublicacionesUseCase {
  constructor(private readonly repo: IPublicacionRepository) {}

  async ejecutar(tenantId: string, params: { take: number; skip: number; order: "asc" | "desc"; estado?: string; etiqueta?: string }, soloPublicadas = false) {
    if (soloPublicadas) {
      return this.repo.findPublicas(tenantId, { take: params.take, skip: params.skip, order: params.order, etiqueta: params.etiqueta })
    }
    return this.repo.findByTenant(tenantId, params)
  }
}
