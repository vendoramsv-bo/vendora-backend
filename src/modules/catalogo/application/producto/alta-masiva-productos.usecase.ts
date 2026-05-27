import type { IProductoRepository, AltaMasivaResult } from "../../domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { AltaMasivaVacia } from "../../domain/catalogo.errors.js"

export class AltaMasivaProductosUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(claProductoIds: string[], tenantId: string, userId: string): Promise<AltaMasivaResult> {
    if (claProductoIds.length === 0) throw new AltaMasivaVacia()

    const resultado = await this.repo.altaMasiva(claProductoIds, tenantId, userId)

    this.notificador.altaMasivaCompletada(tenantId, {
      tenantId,
      productosCreados: resultado.creados.length,
      categoriasCreadas: resultado.categoriasCreadas,
      unidadesMedidaCreadas: resultado.unidadesMedidaCreadas,
    })

    return resultado
  }
}
