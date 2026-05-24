// HTTP 404
export class ClienteNoEncontradoError extends Error {
  readonly code = "CLIENTE_NO_ENCONTRADO"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Cliente ${id} no encontrado` : "Cliente no encontrado")
    this.name = "ClienteNoEncontradoError"
  }
}

// HTTP 409
export class ClienteNombreDuplicadoError extends Error {
  readonly code = "CLIENTE_NOMBRE_DUPLICADO"
  readonly statusCode = 409
  constructor(nombre?: string) {
    super(nombre ? `Ya existe un cliente con el nombre "${nombre}"` : "Nombre de cliente duplicado en el tenant")
    this.name = "ClienteNombreDuplicadoError"
  }
}

// HTTP 409
export class ClienteEmailDuplicadoError extends Error {
  readonly code = "CLIENTE_EMAIL_DUPLICADO"
  readonly statusCode = 409
  constructor(email?: string) {
    super(email ? `Ya existe un cliente con el email "${email}"` : "Email de cliente duplicado en el tenant")
    this.name = "ClienteEmailDuplicadoError"
  }
}

// HTTP 404
export class ProveedorNoEncontradoError extends Error {
  readonly code = "PROVEEDOR_NO_ENCONTRADO"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Proveedor ${id} no encontrado` : "Proveedor no encontrado")
    this.name = "ProveedorNoEncontradoError"
  }
}

// HTTP 409
export class ProveedorNombreDuplicadoError extends Error {
  readonly code = "PROVEEDOR_NOMBRE_DUPLICADO"
  readonly statusCode = 409
  constructor(nombre?: string) {
    super(nombre ? `Ya existe un proveedor con el nombre "${nombre}"` : "Nombre de proveedor duplicado en el tenant")
    this.name = "ProveedorNombreDuplicadoError"
  }
}

// HTTP 409
export class ProveedorNITDuplicadoError extends Error {
  readonly code = "PROVEEDOR_NIT_DUPLICADO"
  readonly statusCode = 409
  constructor(nit?: string) {
    super(nit ? `Ya existe un proveedor con el NIT "${nit}"` : "NIT de proveedor duplicado en el tenant")
    this.name = "ProveedorNITDuplicadoError"
  }
}

// HTTP 422
export class ProveedorEnUsoError extends Error {
  readonly code = "PROVEEDOR_EN_USO"
  readonly statusCode = 422
  constructor() {
    super("El proveedor tiene compras registradas y no puede eliminarse")
    this.name = "ProveedorEnUsoError"
  }
}

// HTTP 404
export class CompraNoEncontradaError extends Error {
  readonly code = "COMPRA_NO_ENCONTRADA"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Compra ${id} no encontrada` : "Compra no encontrada")
    this.name = "CompraNoEncontradaError"
  }
}

// HTTP 422
export class CompraYaConfirmadaError extends Error {
  readonly code = "COMPRA_YA_CONFIRMADA"
  readonly statusCode = 422
  constructor() {
    super("La compra ya está confirmada y no puede modificarse")
    this.name = "CompraYaConfirmadaError"
  }
}

// HTTP 400
export class DetalleVacioError extends Error {
  readonly code = "DETALLE_VACIO"
  readonly statusCode = 400
  constructor() {
    super("Debe incluir al menos un detalle en la compra")
    this.name = "DetalleVacioError"
  }
}

// HTTP 409
export class CostoMotivoYaExisteError extends Error {
  readonly code = "COSTO_MOTIVO_YA_EXISTE"
  readonly statusCode = 409
  constructor(motivo?: string) {
    super(motivo ? `Ya existe un costo con motivo "${motivo}" en esta compra` : "Motivo de costo duplicado en la compra")
    this.name = "CostoMotivoYaExisteError"
  }
}

// HTTP 409
export class DetalleYaExisteError extends Error {
  readonly code = "DETALLE_YA_EXISTE"
  readonly statusCode = 409
  constructor() {
    super("Ya existe un detalle para este producto/variante en la compra")
    this.name = "DetalleYaExisteError"
  }
}
