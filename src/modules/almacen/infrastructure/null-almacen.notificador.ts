import type {
  IAlmacenNotificador,
  StockCriticoPayload,
  StockNormalizadoPayload,
  InsumoStockCriticoPayload,
  InsumoStockNormalizadoPayload,
} from "../domain/ports/IAlmacenNotificador.js"

export class NullAlmacenNotificador implements IAlmacenNotificador {
  stockCritico(_tenantId: string, _payload: StockCriticoPayload): void {}
  stockNormalizado(_tenantId: string, _payload: StockNormalizadoPayload): void {}
  insumoStockCritico(_tenantId: string, _payload: InsumoStockCriticoPayload): void {}
  insumoStockNormalizado(_tenantId: string, _payload: InsumoStockNormalizadoPayload): void {}
}
