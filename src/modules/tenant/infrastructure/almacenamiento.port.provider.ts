import type { IAlmacenamientoPort } from "../domain/ports/IAlmacenamientoPort.js"

let _port: IAlmacenamientoPort | null = null

export function setAlmacenamientoPort(port: IAlmacenamientoPort): void {
  _port = port
}

export function getAlmacenamientoPort(): IAlmacenamientoPort | null {
  return _port
}
