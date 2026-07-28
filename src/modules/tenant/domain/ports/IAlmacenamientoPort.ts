export interface EmitirUrlSubidaInput {
  key: string
  contentType: string
  expiresInSeconds: number
}

export interface EmitirUrlSubidaResultado {
  uploadUrl: string
  publicUrl: string
}

export interface IAlmacenamientoPort {
  emitirUrlSubida(input: EmitirUrlSubidaInput): Promise<EmitirUrlSubidaResultado>

  /** Elimina el archivo del almacenamiento físico. Idempotente: no lanza si la key ya no existe. */
  eliminarArchivo(key: string): Promise<void>

  /**
   * Deriva la key interna a partir de una publicUrl, o null si la URL no
   * pertenece a este backend de almacenamiento (prefijo no coincide). La
   * forma de una publicUrl es un detalle de cada adaptador — el caso de uso
   * que la invoca no debe conocer esa forma directamente.
   */
  extraerKeyDesdeUrlPublica(url: string): string | null
}
