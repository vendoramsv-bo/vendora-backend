export interface ParamsListaOrdenada {
  take: number
  skip: number
  search?: string
}

/** Descripciones, imágenes del local y equipo: contenido del negocio con posición. */
export interface IListaOrdenadaRepository<TItem, TCrear, TEditar> {
  listar(tenantId: string, params: ParamsListaOrdenada): Promise<{ data: TItem[]; total: number }>
  buscar(tenantId: string, id: string): Promise<TItem | null>
  contar(tenantId: string): Promise<number>
  /** -1 si la lista está vacía. */
  maxOrden(tenantId: string): Promise<number>
  crear(tenantId: string, datos: TCrear, orden: number): Promise<TItem>
  editar(tenantId: string, id: string, datos: TEditar): Promise<TItem>
  borrar(tenantId: string, id: string): Promise<void>
  idsActuales(tenantId: string): Promise<string[]>
  /** Asigna `orden = posición` a cada id, en una transacción. */
  aplicarOrden(tenantId: string, ids: string[]): Promise<void>
}
