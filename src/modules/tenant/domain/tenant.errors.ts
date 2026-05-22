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
