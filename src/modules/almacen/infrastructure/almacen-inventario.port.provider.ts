import type { IAlmacenInventarioPort } from "../../ventas/domain/ports/IAlmacenInventarioPort.js"

let _port: IAlmacenInventarioPort | null = null

export function setAlmacenInventarioPort(port: IAlmacenInventarioPort): void {
  _port = port
}

export function getAlmacenInventarioPort(): IAlmacenInventarioPort | null {
  return _port
}
