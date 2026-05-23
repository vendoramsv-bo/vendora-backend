import type {
  IAlmacenNotificador,
  StockCriticoPayload,
  StockNormalizadoPayload,
  InsumoStockCriticoPayload,
  InsumoStockNormalizadoPayload,
} from "../../src/modules/almacen/domain/ports/IAlmacenNotificador.js"

type EventoEmitido = { tipo: string; tenantId: string; payload: unknown }

export class FakeAlmacenNotificador implements IAlmacenNotificador {
  private _eventos: EventoEmitido[] = []

  stockCritico(tenantId: string, payload: StockCriticoPayload): void {
    this._eventos.push({ tipo: "almacen:stock:critico", tenantId, payload })
  }

  stockNormalizado(tenantId: string, payload: StockNormalizadoPayload): void {
    this._eventos.push({ tipo: "almacen:stock:normalizado", tenantId, payload })
  }

  insumoStockCritico(tenantId: string, payload: InsumoStockCriticoPayload): void {
    this._eventos.push({ tipo: "almacen:insumo:stock:critico", tenantId, payload })
  }

  insumoStockNormalizado(tenantId: string, payload: InsumoStockNormalizadoPayload): void {
    this._eventos.push({ tipo: "almacen:insumo:stock:normalizado", tenantId, payload })
  }

  get eventos(): EventoEmitido[] {
    return [...this._eventos]
  }

  tieneEvento(tipo: string, predicado?: (payload: unknown) => boolean): boolean {
    return this._eventos.some(
      (e) => e.tipo === tipo && (predicado == null || predicado(e.payload))
    )
  }

  limpiar(): void {
    this._eventos = []
  }
}
