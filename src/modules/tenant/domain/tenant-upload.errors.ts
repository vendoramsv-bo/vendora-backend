export class PropositoInvalido extends Error {
  readonly code = "PROPOSITO_INVALIDO"
  constructor(tipo: string) {
    super(`El propósito "${tipo}" no existe o no está habilitado`)
    this.name = "PropositoInvalido"
  }
}

export class TipoMimeNoPermitido extends Error {
  readonly code = "TIPO_MIME_NO_PERMITIDO"
  constructor(contentType: string, tiposPermitidos: string[]) {
    super(
      `Tipo de archivo "${contentType}" no permitido. Tipos aceptados: ${tiposPermitidos.join(", ")}`,
    )
    this.name = "TipoMimeNoPermitido"
  }
}

export class TamanoExcedido extends Error {
  readonly code = "TAMANO_EXCEDIDO"
  constructor(tamanoBytes: number, tamanoMaximoBytes: number) {
    super(
      `El archivo (${tamanoBytes} bytes) excede el tamaño máximo permitido de ${tamanoMaximoBytes} bytes`,
    )
    this.name = "TamanoExcedido"
  }
}
