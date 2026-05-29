export class TiendaNoActivaError extends Error {
  readonly code = "TIENDA_NO_ACTIVA"
  readonly statusCode = 422
  constructor() {
    super("La tienda no está activa (esTienda=false)")
    this.name = "TiendaNoActivaError"
  }
}

export class TiendaNoEncontradaError extends Error {
  readonly code = "TIENDA_NO_ENCONTRADA"
  readonly statusCode = 404
  constructor(slug?: string) {
    super(slug ? `Tienda no encontrada: ${slug}` : "Tienda no encontrada")
    this.name = "TiendaNoEncontradaError"
  }
}

export class ProductoDestacadoLimiteError extends Error {
  readonly code = "PRODUCTO_DESTACADO_LIMITE"
  readonly statusCode = 422
  constructor() {
    super("La tienda ya tiene el máximo de 20 productos destacados")
    this.name = "ProductoDestacadoLimiteError"
  }
}

export class ProductoNoVisibleParaDestacadoError extends Error {
  readonly code = "PRODUCTO_NO_VISIBLE_PARA_DESTACADO"
  readonly statusCode = 422
  constructor(productoId: string) {
    super(`El producto ${productoId} no está activo o no es visible públicamente`)
    this.name = "ProductoNoVisibleParaDestacadoError"
  }
}

export class ProductoDestacadoYaExisteError extends Error {
  readonly code = "PRODUCTO_DESTACADO_YA_EXISTE"
  readonly statusCode = 409
  constructor(productoId: string) {
    super(`El producto ${productoId} ya es un producto destacado`)
    this.name = "ProductoDestacadoYaExisteError"
  }
}

export class ConfiguracionNoEncontradaError extends Error {
  readonly code = "CONFIGURACION_NO_ENCONTRADA"
  readonly statusCode = 404
  constructor() {
    super("Configuración de tienda no encontrada")
    this.name = "ConfiguracionNoEncontradaError"
  }
}
