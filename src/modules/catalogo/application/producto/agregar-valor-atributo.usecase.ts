import type { IProductoRepository, AtributoValorCreateDTO } from "../../domain/ports/IProductoRepository.js"
import { AtributoNoEncontrado, AtributoValorDuplicado } from "../../domain/catalogo.errors.js"

export class AgregarValorAtributoUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(atributoId: string, data: AtributoValorCreateDTO, productoId: string, tenantId: string): Promise<unknown> {
    const atributos = await this.repo.listarAtributos(productoId, tenantId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const atributo = (atributos as any[]).find((a) => a.id === atributoId)
    if (!atributo) throw new AtributoNoEncontrado(atributoId)
    try {
      return await this.repo.agregarValorAtributo(atributoId, data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("ATRIBUTO_VALOR_DUPLICADO")) throw new AtributoValorDuplicado()
      throw err
    }
  }
}
