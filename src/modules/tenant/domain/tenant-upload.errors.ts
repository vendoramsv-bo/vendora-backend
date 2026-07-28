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

export class ReferenciaArchivoInvalida extends Error {
  readonly code = "REFERENCIA_INVALIDA"
  constructor(url: string) {
    super(`La referencia de archivo "${url}" no tiene un formato válido`)
    this.name = "ReferenciaArchivoInvalida"
  }
}

export class ArchivoNoPerteneceATenant extends Error {
  readonly code = "ARCHIVO_NO_PERTENECE_A_TENANT"
  constructor() {
    super("El archivo no pertenece al tenant activo")
    this.name = "ArchivoNoPerteneceATenant"
  }
}
