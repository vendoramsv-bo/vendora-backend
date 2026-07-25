import { randomUUID } from "node:crypto"
import type { IAlmacenamientoPort } from "../domain/ports/IAlmacenamientoPort.js"
import { PROPOSITOS_SUBIDA, esTipoSubidaValido } from "../domain/propositos-subida.js"
import { PropositoInvalido, TipoMimeNoPermitido, TamanoExcedido } from "../domain/tenant-upload.errors.js"

export const URL_SUBIDA_TTL_SEGUNDOS = 300

const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

export interface GenerarUrlSubidaInput {
  tenantId: string
  tipo: string
  filename: string
  contentType: string
  size: number
}

export interface GenerarUrlSubidaResultado {
  uploadUrl: string
  publicUrl: string
}

export class GenerarUrlSubidaUseCase {
  constructor(private readonly almacenamiento: IAlmacenamientoPort) {}

  async ejecutar(input: GenerarUrlSubidaInput): Promise<GenerarUrlSubidaResultado> {
    if (!esTipoSubidaValido(input.tipo)) {
      throw new PropositoInvalido(input.tipo)
    }

    const proposito = PROPOSITOS_SUBIDA[input.tipo]
    const tiposPermitidos: readonly string[] = proposito.tiposMimePermitidos

    if (!tiposPermitidos.includes(input.contentType)) {
      throw new TipoMimeNoPermitido(input.contentType, [...tiposPermitidos])
    }

    if (input.size > proposito.tamanoMaximoBytes) {
      throw new TamanoExcedido(input.size, proposito.tamanoMaximoBytes)
    }

    const extension = EXTENSION_POR_MIME[input.contentType] ?? ""
    const key = `tenants/${input.tenantId}/${proposito.carpeta}/${randomUUID()}${extension}`

    return this.almacenamiento.emitirUrlSubida({
      key,
      contentType: input.contentType,
      expiresInSeconds: URL_SUBIDA_TTL_SEGUNDOS,
    })
  }
}
