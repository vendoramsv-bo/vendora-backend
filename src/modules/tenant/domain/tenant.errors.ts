export class TenantNoEncontrado extends Error {
  readonly code = "TENANT_NO_ENCONTRADO"
  constructor(id: string) {
    super(`Tenant no encontrado: ${id}`)
    this.name = "TenantNoEncontrado"
  }
}

export class SlugDuplicado extends Error {
  readonly code = "SLUG_DUPLICADO"
  constructor(slug: string) {
    super(`El slug "${slug}" ya está en uso`)
    this.name = "SlugDuplicado"
  }
}

export class SinTenantActivo extends Error {
  readonly code = "SIN_TENANT_ACTIVO"
  constructor() {
    super("No hay un tenant activo en la sesión")
    this.name = "SinTenantActivo"
  }
}

export class PermisoDenegado extends Error {
  readonly code = "PERMISO_DENEGADO"
  constructor(rol: string, rolRequerido: string) {
    super(`Acción no permitida para rol "${rol}". Se requiere: "${rolRequerido}"`)
    this.name = "PermisoDenegado"
  }
}

export class PropietarioUnico extends Error {
  readonly code = "PROPIETARIO_UNICO"
  constructor() {
    super("No puedes eliminar al único propietario del tenant")
    this.name = "PropietarioUnico"
  }
}

// ─── Configuración del negocio (026) ─────────────────────────────────────────
// Una base común permite al adaptador mapear todos con un solo `instanceof`.

export abstract class ErrorConfiguracion extends Error {
  abstract readonly code: string
  abstract readonly statusCode: 400 | 403 | 404 | 409 | 422
}

export class RecursoConfiguracionNoEncontrado extends ErrorConfiguracion {
  readonly code = "NO_ENCONTRADO"
  readonly statusCode = 404
  constructor(recurso: string) {
    super(`${recurso} no encontrado`)
    this.name = "RecursoConfiguracionNoEncontrado"
  }
}

export class ConflictoUnicidadConfiguracion extends ErrorConfiguracion {
  readonly code = "CONFLICTO_UNICIDAD"
  readonly statusCode = 409
  constructor(detalle: string) {
    super(detalle)
    this.name = "ConflictoUnicidadConfiguracion"
  }
}

export class OrdenDesactualizadoError extends ErrorConfiguracion {
  readonly code = "ORDEN_DESACTUALIZADO"
  readonly statusCode = 409
  constructor() {
    super("El orden enviado no coincide con los elementos actuales; recargá la lista")
    this.name = "OrdenDesactualizadoError"
  }
}

export class LimiteListaAlcanzadoError extends ErrorConfiguracion {
  readonly code = "LIMITE_ALCANZADO"
  readonly statusCode = 422
  constructor(limite: number) {
    super(`Se alcanzó el máximo de ${limite} elementos`)
    this.name = "LimiteListaAlcanzadoError"
  }
}

export class UltimaLocalizacionError extends ErrorConfiguracion {
  readonly code = "ULTIMA_LOCALIZACION"
  readonly statusCode = 422
  constructor() {
    super("El negocio necesita al menos una localización")
    this.name = "UltimaLocalizacionError"
  }
}

export class UltimaVerticalError extends ErrorConfiguracion {
  readonly code = "ULTIMA_VERTICAL"
  readonly statusCode = 422
  constructor() {
    super("El negocio necesita al menos una vertical activa")
    this.name = "UltimaVerticalError"
  }
}

export class UnicoPropietarioError extends ErrorConfiguracion {
  readonly code = "UNICO_PROPIETARIO"
  readonly statusCode = 422
  constructor() {
    super("El negocio no puede quedar sin propietario")
    this.name = "UnicoPropietarioError"
  }
}

export class RolNoAsignableError extends ErrorConfiguracion {
  readonly code = "ROL_NO_ASIGNABLE"
  readonly statusCode = 422
  constructor(rol: string, readonly rolesValidos: string[]) {
    super(`El rol ${rol} no corresponde a las verticales activas. Roles válidos: ${rolesValidos.join(", ")}`)
    this.name = "RolNoAsignableError"
  }
}

export class SoloPropietarioError extends ErrorConfiguracion {
  readonly code = "SOLO_PROPIETARIO"
  readonly statusCode = 403
  constructor() {
    super("Solo un propietario puede asignar, quitar o modificar a un propietario")
    this.name = "SoloPropietarioError"
  }
}

export class YaEsMiembroError extends ErrorConfiguracion {
  readonly code = "YA_ES_MIEMBRO"
  readonly statusCode = 409
  constructor(email: string) {
    super(`${email} ya pertenece al negocio`)
    this.name = "YaEsMiembroError"
  }
}

export class InvitacionPendienteError extends ErrorConfiguracion {
  readonly code = "INVITACION_PENDIENTE"
  readonly statusCode = 409
  constructor(email: string) {
    super(`${email} ya tiene una invitación pendiente`)
    this.name = "InvitacionPendienteError"
  }
}
