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

// HTTP 409
export class CajaYaAbiertaError extends Error {
  readonly code = "CAJA_YA_ABIERTA"
  readonly statusCode = 409
  constructor() {
    super("Ya existe una caja abierta para este punto de venta, turno, miembro y fecha")
    this.name = "CajaYaAbiertaError"
  }
}

// HTTP 422
export class CajaYaCerradaError extends Error {
  readonly code = "CAJA_YA_CERRADA"
  readonly statusCode = 422
  constructor() {
    super("La caja ya está cerrada")
    this.name = "CajaYaCerradaError"
  }
}

// HTTP 422
export class PuntoVentaInactivoError extends Error {
  readonly code = "PUNTO_VENTA_INACTIVO"
  readonly statusCode = 422
  constructor() {
    super("El punto de venta está inactivo y no puede usarse para apertura de caja")
    this.name = "PuntoVentaInactivoError"
  }
}

// HTTP 422
export class TurnoInactivoError extends Error {
  readonly code = "TURNO_INACTIVO"
  readonly statusCode = 422
  constructor() {
    super("El turno de atención está inactivo y no puede usarse para apertura de caja")
    this.name = "TurnoInactivoError"
  }
}

// HTTP 422
export class VentaYaConfirmadaError extends Error {
  readonly code = "VENTA_YA_CONFIRMADA"
  readonly statusCode = 422
  constructor() {
    super("La venta ya está confirmada y no puede modificarse")
    this.name = "VentaYaConfirmadaError"
  }
}

// HTTP 422
export class PedidoTerminalError extends Error {
  readonly code = "PEDIDO_TERMINAL"
  readonly statusCode = 422
  constructor() {
    super("El pedido está en un estado terminal y no puede modificarse")
    this.name = "PedidoTerminalError"
  }
}

// HTTP 409
export class PuntoVentaNombreDuplicadoError extends Error {
  readonly code = "PUNTO_VENTA_NOMBRE_DUPLICADO"
  readonly statusCode = 409
  constructor(nombre?: string) {
    super(nombre ? `Ya existe un punto de venta con el nombre "${nombre}"` : "Nombre de punto de venta duplicado en el tenant")
    this.name = "PuntoVentaNombreDuplicadoError"
  }
}

// HTTP 409
export class TurnoNombreDuplicadoError extends Error {
  readonly code = "TURNO_NOMBRE_DUPLICADO"
  readonly statusCode = 409
  constructor(nombre?: string) {
    super(nombre ? `Ya existe un turno con el nombre "${nombre}"` : "Nombre de turno duplicado en el tenant")
    this.name = "TurnoNombreDuplicadoError"
  }
}

// HTTP 404
export class PuntoVentaNoEncontradoError extends Error {
  readonly code = "PUNTO_VENTA_NO_ENCONTRADO"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Punto de venta ${id} no encontrado` : "Punto de venta no encontrado")
    this.name = "PuntoVentaNoEncontradoError"
  }
}

// HTTP 404
export class TurnoNoEncontradoError extends Error {
  readonly code = "TURNO_NO_ENCONTRADO"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Turno ${id} no encontrado` : "Turno no encontrado")
    this.name = "TurnoNoEncontradoError"
  }
}

// HTTP 404
export class CajaNoEncontradaError extends Error {
  readonly code = "CAJA_NO_ENCONTRADA"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Caja ${id} no encontrada` : "Caja no encontrada")
    this.name = "CajaNoEncontradaError"
  }
}

// HTTP 404
export class VentaNoEncontradaError extends Error {
  readonly code = "VENTA_NO_ENCONTRADA"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Venta ${id} no encontrada` : "Venta no encontrada")
    this.name = "VentaNoEncontradaError"
  }
}

// HTTP 404
export class PedidoNoEncontradoError extends Error {
  readonly code = "PEDIDO_NO_ENCONTRADO"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Pedido ${id} no encontrado` : "Pedido no encontrado")
    this.name = "PedidoNoEncontradoError"
  }
}

// HTTP 404
export class GastoNoEncontradoError extends Error {
  readonly code = "GASTO_NO_ENCONTRADO"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Gasto ${id} no encontrado` : "Gasto no encontrado")
    this.name = "GastoNoEncontradoError"
  }
}
