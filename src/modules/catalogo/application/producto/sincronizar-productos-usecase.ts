import type { IProductoRepository, SincronizarSeleccionResult } from "../../domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"

export class SincronizarProductosUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(claProductoIds: string[], tenantId: string, userId: string): Promise<SincronizarSeleccionResult> {
    const resultado = await this.repo.sincronizarSeleccion(claProductoIds, tenantId, userId)

    if (resultado.creados.length > 0) {
      this.notificador.altaMasivaCompletada(tenantId, {
        tenantId,
        productosCreados: resultado.creados.length,
        categoriasCreadas: resultado.categoriasCreadas,
        unidadesMedidaCreadas: resultado.unidadesMedidaCreadas,
      })
    }

    return resultado
  }
}
