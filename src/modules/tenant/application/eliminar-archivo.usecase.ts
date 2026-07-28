import type { IAlmacenamientoPort } from "../domain/ports/IAlmacenamientoPort.js"
import { ReferenciaArchivoInvalida, ArchivoNoPerteneceATenant } from "../domain/tenant-upload.errors.js"

export interface EliminarArchivoInput {
  tenantId: string
  url: string
}

export class EliminarArchivoUseCase {
  constructor(private readonly almacenamiento: IAlmacenamientoPort) {}

  async ejecutar(input: EliminarArchivoInput): Promise<void> {
    const key = this.almacenamiento.extraerKeyDesdeUrlPublica(input.url)
    if (!key) {
      throw new ReferenciaArchivoInvalida(input.url)
    }

    const segmentos = key.split("/")
    if (segmentos.length !== 4 || segmentos[0] !== "tenants") {
      throw new ReferenciaArchivoInvalida(input.url)
    }

    if (segmentos[1] !== input.tenantId) {
      throw new ArchivoNoPerteneceATenant()
    }

    await this.almacenamiento.eliminarArchivo(key)
  }
}
