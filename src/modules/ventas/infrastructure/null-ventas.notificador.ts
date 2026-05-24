import type {
  IVentasNotificador,
  ClienteCreadoPayload,
  ClienteActualizadoPayload,
  ProveedorCreadoPayload,
  ProveedorActualizadoPayload,
  CompraCreadaPayload,
  CompraActualizadaPayload,
  CompraConfirmadaPayload,
} from "../domain/ports/IVentasNotificador.js"

export class NullVentasNotificador implements IVentasNotificador {
  clienteCreado(_tenantId: string, _payload: ClienteCreadoPayload): void {}
  clienteActualizado(_tenantId: string, _payload: ClienteActualizadoPayload): void {}
  proveedorCreado(_tenantId: string, _payload: ProveedorCreadoPayload): void {}
  proveedorActualizado(_tenantId: string, _payload: ProveedorActualizadoPayload): void {}
  compraCreada(_tenantId: string, _payload: CompraCreadaPayload): void {}
  compraActualizada(_tenantId: string, _payload: CompraActualizadaPayload): void {}
  compraConfirmada(_tenantId: string, _payload: CompraConfirmadaPayload): void {}
}
