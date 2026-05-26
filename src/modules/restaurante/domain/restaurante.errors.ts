export class RestauranteNoEncontrado extends Error {
  readonly code = "RESTAURANTE_NO_ENCONTRADO"
  constructor() {
    super("Restaurante no encontrado para este tenant")
    this.name = "RestauranteNoEncontrado"
  }
}

export class TiempoComidaNoEncontrado extends Error {
  readonly code = "TIEMPO_COMIDA_NO_ENCONTRADO"
  constructor(id: string) {
    super(`Tiempo de comida no encontrado: ${id}`)
    this.name = "TiempoComidaNoEncontrado"
  }
}

export class TiempoComidaDuplicado extends Error {
  readonly code = "TIEMPO_COMIDA_DUPLICADO"
  constructor(nombre: string) {
    super(`Ya existe un tiempo de comida con el nombre "${nombre}" en este restaurante`)
    this.name = "TiempoComidaDuplicado"
  }
}

export class TiempoComidaEnUso extends Error {
  readonly code = "TIEMPO_COMIDA_EN_USO"
  constructor() {
    super("No se puede eliminar el tiempo de comida porque tiene ítems de menú activos")
    this.name = "TiempoComidaEnUso"
  }
}

export class MenuNoEncontrado extends Error {
  readonly code = "MENU_NO_ENCONTRADO"
  constructor(id: string) {
    super(`Menú no encontrado: ${id}`)
    this.name = "MenuNoEncontrado"
  }
}

export class MenuNoEditable extends Error {
  readonly code = "MENU_NO_EDITABLE"
  constructor(estado: string) {
    super(`El menú en estado "${estado}" no puede editarse`)
    this.name = "MenuNoEditable"
  }
}

export class MenuSinItemsDisponibles extends Error {
  readonly code = "MENU_SIN_ITEMS_DISPONIBLES"
  constructor() {
    super("El menú debe tener al menos un ítem disponible para publicarse")
    this.name = "MenuSinItemsDisponibles"
  }
}

export class MenuNoPublicado extends Error {
  readonly code = "MENU_NO_PUBLICADO"
  constructor() {
    super("Esta acción requiere que el menú esté en estado PUBLICADO")
    this.name = "MenuNoPublicado"
  }
}

export class TransicionMenuInvalida extends Error {
  readonly code = "TRANSICION_INVALIDA"
  constructor(desde: string, hacia: string) {
    super(`No se puede pasar el menú de "${desde}" a "${hacia}"`)
    this.name = "TransicionMenuInvalida"
  }
}

export class ItemDuplicado extends Error {
  readonly code = "ITEM_DUPLICADO"
  constructor() {
    super("Ya existe un ítem con ese producto y tiempo de comida en el menú")
    this.name = "ItemDuplicado"
  }
}

export class ItemNoDisponible extends Error {
  readonly code = "ITEM_NO_DISPONIBLE"
  constructor(nombre: string) {
    super(`El ítem "${nombre}" no está disponible en este momento`)
    this.name = "ItemNoDisponible"
  }
}

export class ItemConReservasActivas extends Error {
  readonly code = "ITEM_CON_RESERVAS_ACTIVAS"
  constructor() {
    super("No se puede eliminar el ítem porque está referenciado en reservas activas")
    this.name = "ItemConReservasActivas"
  }
}

export class ReservaNoEncontrada extends Error {
  readonly code = "RESERVA_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Reserva no encontrada: ${id}`)
    this.name = "ReservaNoEncontrada"
  }
}

export class ReservaYaPagada extends Error {
  readonly code = "RESERVA_YA_PAGADA"
  constructor() {
    super("La reserva ya fue pagada y no puede modificarse")
    this.name = "ReservaYaPagada"
  }
}

export class TransicionReservaInvalida extends Error {
  readonly code = "TRANSICION_INVALIDA"
  constructor(desde: string, hacia: string) {
    super(`No se puede pasar la reserva de "${desde}" a "${hacia}"`)
    this.name = "TransicionReservaInvalida"
  }
}

export class TransicionCocinaInvalida extends Error {
  readonly code = "TRANSICION_COCINA_INVALIDA"
  constructor(desde: string, hacia: string) {
    super(`No se puede pasar el estado de cocina de "${desde}" a "${hacia}"`)
    this.name = "TransicionCocinaInvalida"
  }
}

export class RolSinPermiso extends Error {
  readonly code = "ROL_SIN_PERMISO"
  constructor(rol: string, accion: string) {
    super(`El rol "${rol}" no puede realizar la acción: ${accion}`)
    this.name = "RolSinPermiso"
  }
}

export class CajaNoAbierta extends Error {
  readonly code = "CAJA_NO_ABIERTA"
  constructor() {
    super("No hay caja abierta. Abra una caja antes de registrar el pago.")
    this.name = "CajaNoAbierta"
  }
}

export class PlataformaNoConfigurada extends Error {
  readonly code = "PLATAFORMA_NO_CONFIGURADA"
  constructor(plataforma: string) {
    super(`Las credenciales de ${plataforma} no están configuradas en el perfil del restaurante`)
    this.name = "PlataformaNoConfigurada"
  }
}

export class PublicacionYaProcesada extends Error {
  readonly code = "PUBLICACION_YA_PROCESADA"
  constructor() {
    super("La publicación ya fue procesada y no puede cancelarse")
    this.name = "PublicacionYaProcesada"
  }
}

export class FechaEnPasado extends Error {
  readonly code = "FECHA_EN_PASADO"
  constructor() {
    super("La fecha programada ya pasó")
    this.name = "FechaEnPasado"
  }
}

export class HoraFueraDeServicio extends Error {
  readonly code = "HORA_FUERA_DE_SERVICIO"
  constructor() {
    super("La hora de llegada está fuera de los horarios de servicio del restaurante")
    this.name = "HoraFueraDeServicio"
  }
}

export class PublicacionNoEncontrada extends Error {
  readonly code = "PUBLICACION_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Publicación no encontrada: ${id}`)
    this.name = "PublicacionNoEncontrada"
  }
}
