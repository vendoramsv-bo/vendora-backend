import type {
  IVentasNotificador,
  ClienteCreadoPayload,
  ClienteActualizadoPayload,
  ProveedorCreadoPayload,
  ProveedorActualizadoPayload,
  CompraCreadaPayload,
  CompraActualizadaPayload,
  CompraConfirmadaPayload,
} from "../../src/modules/ventas/domain/ports/IVentasNotificador.js"

export class FakeVentasNotificador implements IVentasNotificador {
  readonly events: Array<{ event: string; tenantId: string; payload: unknown }> = []

  clienteCreado(tenantId: string, payload: ClienteCreadoPayload): void {
    this.events.push({ event: "clienteCreado", tenantId, payload })
  }

  clienteActualizado(tenantId: string, payload: ClienteActualizadoPayload): void {
    this.events.push({ event: "clienteActualizado", tenantId, payload })
  }

  proveedorCreado(tenantId: string, payload: ProveedorCreadoPayload): void {
    this.events.push({ event: "proveedorCreado", tenantId, payload })
  }

  proveedorActualizado(tenantId: string, payload: ProveedorActualizadoPayload): void {
    this.events.push({ event: "proveedorActualizado", tenantId, payload })
  }

  compraCreada(tenantId: string, payload: CompraCreadaPayload): void {
    this.events.push({ event: "compraCreada", tenantId, payload })
  }

  compraActualizada(tenantId: string, payload: CompraActualizadaPayload): void {
    this.events.push({ event: "compraActualizada", tenantId, payload })
  }

  compraConfirmada(tenantId: string, payload: CompraConfirmadaPayload): void {
    this.events.push({ event: "compraConfirmada", tenantId, payload })
  }
}
