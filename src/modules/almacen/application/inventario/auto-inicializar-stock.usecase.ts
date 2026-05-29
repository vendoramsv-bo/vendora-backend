import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"

export class AutoInicializarStockUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(tenantId: string, createdById?: string) {
    return this.repo.inicializarStockBulk(tenantId, createdById)
  }
}
