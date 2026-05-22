export class EmailNoVerificado extends Error {
  readonly code = "EMAIL_NO_VERIFICADO"
  constructor(email: string) {
    super(`El email ${email} no ha sido verificado`)
    this.name = "EmailNoVerificado"
  }
}

export class CredencialesInvalidas extends Error {
  readonly code = "CREDENCIALES_INVALIDAS"
  constructor() {
    super("Email o contraseña incorrectos")
    this.name = "CredencialesInvalidas"
  }
}

export class EmailYaRegistrado extends Error {
  readonly code = "EMAIL_YA_REGISTRADO"
  constructor(email: string) {
    super(`El email ${email} ya está registrado`)
    this.name = "EmailYaRegistrado"
  }
}

export class TokenInvalido extends Error {
  readonly code = "TOKEN_INVALIDO"
  constructor() {
    super("El token es inválido o ha expirado")
    this.name = "TokenInvalido"
  }
}

export class CuentaEliminada extends Error {
  readonly code = "CUENTA_ELIMINADA"
  constructor() {
    super("La cuenta ha sido eliminada")
    this.name = "CuentaEliminada"
  }
}
