import type {
  ICatalogoNotificador,
  ActividadCreadaPayload,
  CategoriaCreadaPayload,
  CategoriaActualizadaPayload,
  ProductoCreadoPayload,
  ProductoActualizadoPayload,
  ProductoEstadoCambiadoPayload,
  OfertaCreadaPayload,
  OfertaActualizadaPayload,
} from "../domain/ports/ICatalogoNotificador.js"

export class NullCatalogoNotificador implements ICatalogoNotificador {
  actividadCreada(_tenantId: string, _payload: ActividadCreadaPayload): void {}
  categoriaCreada(_tenantId: string, _payload: CategoriaCreadaPayload): void {}
  categoriaActualizada(_tenantId: string, _payload: CategoriaActualizadaPayload): void {}
  productoCreado(_tenantId: string, _payload: ProductoCreadoPayload): void {}
  productoActualizado(_tenantId: string, _payload: ProductoActualizadoPayload): void {}
  productoEstadoCambiado(_tenantId: string, _payload: ProductoEstadoCambiadoPayload): void {}
  ofertaCreada(_tenantId: string, _payload: OfertaCreadaPayload): void {}
  ofertaActualizada(_tenantId: string, _payload: OfertaActualizadaPayload): void {}
}
