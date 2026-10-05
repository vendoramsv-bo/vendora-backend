export interface DatosLocalizacion {
  latitud: number
  longitud: number
  direccion: string
  barrio?: string
  ciudad: string
  departamento: string
}

export interface LocalizacionItem extends DatosLocalizacion {
  id: string
  createdAt: string
}

export interface ILocalizacionRepository {
  listar(tenantId: string, params: { take: number; skip: number; search?: string }): Promise<{ data: LocalizacionItem[]; total: number }>
  buscar(tenantId: string, id: string): Promise<LocalizacionItem | null>
  contar(tenantId: string): Promise<number>
  crear(tenantId: string, datos: DatosLocalizacion): Promise<LocalizacionItem>
  editar(tenantId: string, id: string, datos: Partial<DatosLocalizacion>): Promise<LocalizacionItem>
  borrar(tenantId: string, id: string): Promise<void>
}
