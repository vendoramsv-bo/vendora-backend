import type { IProductoRepository } from "../../domain/ports/IProductoRepository.js"

export class VerificarCodigoUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(
    tenantId: string,
    codigo: string,
  ): Promise<{ existe: boolean; producto?: { id: string; nombre: string; codigo: string } }> {
    return this.repo.verificarCodigo(tenantId, codigo)
  }
}
