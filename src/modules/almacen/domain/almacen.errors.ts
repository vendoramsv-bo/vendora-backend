// Errores de dominio del módulo almacén
// HTTP 404
export class VarianteNoEncontradaError extends Error {
  readonly code = "VARIANTE_NO_ENCONTRADA"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Variante ${id} no encontrada` : "Variante no encontrada")
    this.name = "VarianteNoEncontradaError"
  }
}

// HTTP 422 — variante existe pero nunca fue inicializada en inventario
export class VarianteNoInicializadaError extends Error {
  readonly code = "VARIANTE_NO_INICIALIZADA"
  readonly statusCode = 422
  constructor(id?: string) {
    super(id ? `Variante ${id} no está inicializada en inventario` : "Variante no inicializada en inventario")
    this.name = "VarianteNoInicializadaError"
  }
}

// HTTP 409
export class VarianteYaInicializadaError extends Error {
  readonly code = "VARIANTE_YA_INICIALIZADA"
  readonly statusCode = 409
  constructor(id?: string) {
    super(id ? `Variante ${id} ya fue inicializada en inventario` : "Variante ya inicializada en inventario")
    this.name = "VarianteYaInicializadaError"
  }
}

// HTTP 404
export class InsumoNoEncontradoError extends Error {
  readonly code = "INSUMO_NO_ENCONTRADO"
  readonly statusCode = 404
  constructor(id?: string) {
    super(id ? `Insumo ${id} no encontrado` : "Insumo no encontrado")
    this.name = "InsumoNoEncontradoError"
  }
}

// HTTP 409
export class InsumoNombreDuplicadoError extends Error {
  readonly code = "INSUMO_NOMBRE_DUPLICADO"
  readonly statusCode = 409
  constructor(nombre?: string) {
    super(nombre ? `Ya existe un insumo con el nombre "${nombre}"` : "Nombre de insumo duplicado en el tenant")
    this.name = "InsumoNombreDuplicadoError"
  }
}

// HTTP 422 — el insumo está referenciado en recetas activas; incluye lista de productos afectados
export class InsumoEnUsoEnRecetaError extends Error {
  readonly code = "INSUMO_EN_USO_EN_RECETA"
  readonly statusCode = 422
  readonly productoIds: string[]
  constructor(productoIds: string[]) {
    super(`El insumo está en uso en ${productoIds.length} receta(s) activa(s)`)
    this.name = "InsumoEnUsoEnRecetaError"
    this.productoIds = productoIds
  }
}

// No bloquea — se retorna como advertencia (header X-Warning: insumo-vencido)
export class InsumoVencidoWarning extends Error {
  readonly code = "INSUMO_VENCIDO"
  readonly isWarning = true
  constructor(nombre?: string) {
    super(nombre ? `El insumo "${nombre}" está vencido` : "Insumo vencido")
    this.name = "InsumoVencidoWarning"
  }
}

// HTTP 422 — stock insuficiente (solo cuando forzar=false)
export class StockInsuficienteError extends Error {
  readonly code = "STOCK_INSUFICIENTE"
  readonly statusCode = 422
  constructor(message?: string) {
    super(message ?? "Stock insuficiente para completar la operación")
    this.name = "StockInsuficienteError"
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

// HTTP 400
export class DetalleVacioError extends Error {
  readonly code = "DETALLE_VACIO"
  readonly statusCode = 400
  constructor() {
    super("Debe incluir al menos un detalle en la operación")
    this.name = "DetalleVacioError"
  }
}

// HTTP 400
export class MotivoRequeridoError extends Error {
  readonly code = "MOTIVO_REQUERIDO"
  readonly statusCode = 400
  constructor() {
    super("Se requiere un motivo para esta operación")
    this.name = "MotivoRequeridoError"
  }
}
