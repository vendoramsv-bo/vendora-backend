export class ActividadNoEncontrada extends Error {
  readonly code = "ACTIVIDAD_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Actividad económica no encontrada: ${id}` : "Actividad económica no encontrada")
    this.name = "ActividadNoEncontrada"
  }
}

export class ActividadDuplicada extends Error {
  readonly code = "ACTIVIDAD_DUPLICADA"
  constructor() {
    super("Esta actividad económica ya está activada para el tenant")
    this.name = "ActividadDuplicada"
  }
}

export class ActividadEnUso extends Error {
  readonly code = "ACTIVIDAD_EN_USO"
  constructor() {
    super("No se puede desactivar la actividad porque tiene categorías o productos activos")
    this.name = "ActividadEnUso"
  }
}

export class UnidadNoEncontrada extends Error {
  readonly code = "UNIDAD_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Unidad de medida no encontrada: ${id}` : "Unidad de medida no encontrada")
    this.name = "UnidadNoEncontrada"
  }
}

export class UnidadDuplicada extends Error {
  readonly code = "UNIDAD_DUPLICADA"
  constructor() {
    super("Ya existe una unidad de medida con ese nombre en el tenant")
    this.name = "UnidadDuplicada"
  }
}

export class CategoriaNombreDuplicado extends Error {
  readonly code = "CATEGORIA_NOMBRE_DUPLICADO"
  constructor() {
    super("Ya existe una categoría con ese nombre bajo el mismo padre y actividad")
    this.name = "CategoriaNombreDuplicado"
  }
}

export class CategoriaNoEncontrada extends Error {
  readonly code = "CATEGORIA_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Categoría no encontrada: ${id}` : "Categoría no encontrada")
    this.name = "CategoriaNoEncontrada"
  }
}

export class CategoriaPadreNoEncontrada extends Error {
  readonly code = "CATEGORIA_PADRE_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Categoría padre no encontrada: ${id}` : "Categoría padre no encontrada")
    this.name = "CategoriaPadreNoEncontrada"
  }
}

export class ProductoCodigoDuplicado extends Error {
  readonly code = "PRODUCTO_CODIGO_DUPLICADO"
  constructor() {
    super("Ya existe un producto con ese código en la misma categoría y tenant")
    this.name = "ProductoCodigoDuplicado"
  }
}

export class ProductoNombreDuplicado extends Error {
  readonly code = "PRODUCTO_NOMBRE_DUPLICADO"
  constructor() {
    super("Ya existe un producto con ese nombre en la misma categoría y tenant")
    this.name = "ProductoNombreDuplicado"
  }
}

export class ProductoNoEncontrado extends Error {
  readonly code = "PRODUCTO_NO_ENCONTRADO"
  constructor(id?: string) {
    super(id ? `Producto no encontrado: ${id}` : "Producto no encontrado")
    this.name = "ProductoNoEncontrado"
  }
}

export class AtributoNombreDuplicado extends Error {
  readonly code = "ATRIBUTO_NOMBRE_DUPLICADO"
  constructor() {
    super("Ya existe un atributo con ese nombre en el producto")
    this.name = "AtributoNombreDuplicado"
  }
}

export class AtributoNoEncontrado extends Error {
  readonly code = "ATRIBUTO_NO_ENCONTRADO"
  constructor(id?: string) {
    super(id ? `Atributo no encontrado: ${id}` : "Atributo no encontrado")
    this.name = "AtributoNoEncontrado"
  }
}

export class AtributoValorDuplicado extends Error {
  readonly code = "ATRIBUTO_VALOR_DUPLICADO"
  constructor() {
    super("Ya existe este valor para el atributo")
    this.name = "AtributoValorDuplicado"
  }
}

export class AtributoValorEnUso extends Error {
  readonly code = "ATRIBUTO_VALOR_EN_USO"
  constructor() {
    super("No se puede eliminar el valor porque está siendo usado por una variante activa")
    this.name = "AtributoValorEnUso"
  }
}

export class VarianteSkuDuplicado extends Error {
  readonly code = "VARIANTE_SKU_DUPLICADO"
  constructor() {
    super("Ya existe una variante con ese SKU en el producto")
    this.name = "VarianteSkuDuplicado"
  }
}

export class VarianteAtributosDuplicados extends Error {
  readonly code = "VARIANTE_ATRIBUTOS_DUPLICADOS"
  constructor() {
    super("Ya existe una variante con esa combinación de atributos en el producto")
    this.name = "VarianteAtributosDuplicados"
  }
}

export class VarianteNoEncontrada extends Error {
  readonly code = "VARIANTE_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Variante no encontrada: ${id}` : "Variante no encontrada")
    this.name = "VarianteNoEncontrada"
  }
}

export class OpcionNombreDuplicada extends Error {
  readonly code = "OPCION_NOMBRE_DUPLICADA"
  constructor() {
    super("Ya existe una opción con ese nombre en el producto")
    this.name = "OpcionNombreDuplicada"
  }
}

export class OpcionNoEncontrada extends Error {
  readonly code = "OPCION_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Opción no encontrada: ${id}` : "Opción no encontrada")
    this.name = "OpcionNoEncontrada"
  }
}

export class OfertaSolapada extends Error {
  readonly code = "OFERTA_SOLAPADA"
  constructor() {
    super("Ya existe una oferta activa para ese producto/variante que se solapa con las fechas indicadas")
    this.name = "OfertaSolapada"
  }
}

export class OfertaNoEncontrada extends Error {
  readonly code = "OFERTA_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Oferta no encontrada: ${id}` : "Oferta no encontrada")
    this.name = "OfertaNoEncontrada"
  }
}

export class PrecioVolumenCantidadDuplicada extends Error {
  readonly code = "PRECIO_VOLUMEN_CANTIDAD_DUPLICADA"
  constructor() {
    super("Ya existe un precio por volumen para esa cantidad en el producto/variante")
    this.name = "PrecioVolumenCantidadDuplicada"
  }
}

export class ProductoConMovimientos extends Error {
  readonly code = "PRODUCTO_CON_MOVIMIENTOS"
  constructor(id?: string) {
    super(id ? `El producto ${id} ya tiene movimientos reales de inventario` : "El producto ya tiene movimientos reales de inventario")
    this.name = "ProductoConMovimientos"
  }
}

export class AltaMasivaVacia extends Error {
  readonly code = "ALTA_MASIVA_VACIA"
  constructor() {
    super("Se requiere al menos una plantilla del catálogo maestro")
    this.name = "AltaMasivaVacia"
  }
}

export class ClaProductoNoEncontrado extends Error {
  readonly code = "CLA_PRODUCTO_NO_ENCONTRADO"
  constructor(public readonly ids: string[]) {
    super(`Las siguientes plantillas no existen en el catálogo maestro: ${ids.join(", ")}`)
    this.name = "ClaProductoNoEncontrado"
  }
}

export class SinAtributos extends Error {
  readonly code = "SIN_ATRIBUTOS"
  constructor() {
    super("El producto no tiene atributos definidos")
    this.name = "SinAtributos"
  }
}
