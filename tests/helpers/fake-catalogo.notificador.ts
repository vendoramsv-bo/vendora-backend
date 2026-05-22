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
} from "../../src/modules/catalogo/domain/ports/ICatalogoNotificador.js"

export class FakeCatalogoNotificador implements ICatalogoNotificador {
  eventos: { tipo: string; payload: unknown }[] = []

  actividadCreada(_tenantId: string, payload: ActividadCreadaPayload): void {
    this.eventos.push({ tipo: "catalogo:actividad:creada", payload })
  }

  categoriaCreada(_tenantId: string, payload: CategoriaCreadaPayload): void {
    this.eventos.push({ tipo: "catalogo:categoria:creada", payload })
  }

  categoriaActualizada(_tenantId: string, payload: CategoriaActualizadaPayload): void {
    this.eventos.push({ tipo: "catalogo:categoria:actualizada", payload })
  }

  productoCreado(_tenantId: string, payload: ProductoCreadoPayload): void {
    this.eventos.push({ tipo: "catalogo:producto:creado", payload })
  }

  productoActualizado(_tenantId: string, payload: ProductoActualizadoPayload): void {
    this.eventos.push({ tipo: "catalogo:producto:actualizado", payload })
  }

  productoEstadoCambiado(_tenantId: string, payload: ProductoEstadoCambiadoPayload): void {
    this.eventos.push({ tipo: "catalogo:producto:estadoCambiado", payload })
  }

  ofertaCreada(_tenantId: string, payload: OfertaCreadaPayload): void {
    this.eventos.push({ tipo: "catalogo:oferta:creada", payload })
  }

  ofertaActualizada(_tenantId: string, payload: OfertaActualizadaPayload): void {
    this.eventos.push({ tipo: "catalogo:oferta:actualizada", payload })
  }

  limpiar(): void {
    this.eventos = []
  }

  tieneEvento(tipo: string, predicado?: (payload: unknown) => boolean): boolean {
    return this.eventos.some((e) => e.tipo === tipo && (!predicado || predicado(e.payload)))
  }
}
