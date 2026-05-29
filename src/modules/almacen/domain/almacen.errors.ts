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

// HTTP 422 — la aprobación dejaría un producto/variante con stock negativo
export class StockNegativoError extends Error {
  readonly code = "STOCK_NEGATIVO"
  readonly statusCode = 422
  readonly productoId: string
  readonly varianteId?: string
  readonly stockResultante: number
  constructor(productoId: string, stockResultante: number, varianteId?: string) {
    super(`La operación dejaría el stock en ${stockResultante} (negativo)`)
    this.name = "StockNegativoError"
    this.productoId = productoId
    this.varianteId = varianteId
    this.stockResultante = stockResultante
  }
}

// HTTP 422 — la aprobación dejaría un insumo con stock negativo
export class StockNegativoInsumoError extends Error {
  readonly code = "STOCK_NEGATIVO_INSUMO"
  readonly statusCode = 422
  readonly insumoId: string
  readonly stockResultante: number
  constructor(insumoId: string, stockResultante: number) {
    super(`La operación dejaría el stock del insumo en ${stockResultante} (negativo)`)
    this.name = "StockNegativoInsumoError"
    this.insumoId = insumoId
    this.stockResultante = stockResultante
  }
}

// HTTP 409 — el documento fue modificado; la versión enviada es obsoleta
export class ConflictoVersionError extends Error {
  readonly code = "CONFLICTO_VERSION"
  readonly statusCode = 409
  constructor() {
    super("El documento fue modificado por otra operación; refresque y reintente")
    this.name = "ConflictoVersionError"
  }
}

// HTTP 409 — el documento ya fue aprobado y es inmutable
export class DocumentoYaAprobadoError extends Error {
  readonly code = "DOCUMENTO_YA_APROBADO"
  readonly statusCode = 409
  constructor(tipo?: string) {
    super(tipo ? `El ${tipo} ya fue aprobado y no puede modificarse` : "El documento ya fue aprobado y no puede modificarse")
    this.name = "DocumentoYaAprobadoError"
  }
}

// HTTP 404 — documento de inventario no encontrado
export class DocumentoNoEncontradoError extends Error {
  readonly code: string
  readonly statusCode = 404
  constructor(tipo: string, id?: string) {
    super(id ? `${tipo} con id ${id} no encontrado` : `${tipo} no encontrado`)
    this.name = "DocumentoNoEncontradoError"
    this.code = `${tipo.toUpperCase().replace(/ /g, "_")}_NO_ENCONTRADO`
  }
}
