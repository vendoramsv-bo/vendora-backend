export interface DatosPropietario {
  nombre: string
  telefono: string
  domicilio?: string
  referenciaNombre?: string
  referenciaTelefono?: string
}

export interface PropietarioItem extends DatosPropietario {
  id: string
  createdAt: string
}

/** Uno por negocio (spec 026, Q1): no hay alta ni baja. */
export interface IPropietarioRepository {
  delNegocio(tenantId: string): Promise<PropietarioItem | null>
  editar(tenantId: string, id: string, datos: Partial<DatosPropietario>, actorUserId: string): Promise<PropietarioItem>
}
