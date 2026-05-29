export interface ReaccionPayload {
  elementoTipo: "PRODUCTO" | "TIENDA" | "PUBLICACION" | "COMENTARIO_PRODUCTO" | "COMENTARIO_TIENDA" | "COMENTARIO_PUBLICACION"
  elementoId: string
  tenantId: string
  userId: string
  tipo?: string
  emoji?: string
  removed: boolean
  fecha: string
}

export interface ComentarioPayload {
  elementoTipo: "PRODUCTO" | "TIENDA" | "PUBLICACION"
  elementoId: string
  tenantId: string
  comentarioId: string
  padreId?: string
  userId: string
  contenido: string
  esRespuesta: boolean
  fecha: string
}

export interface ValoracionPayload {
  elementoTipo: "PRODUCTO" | "TIENDA"
  elementoId: string
  tenantId: string
  userId: string
  puntuacion: number
  nuevoPromedio: number
  fecha: string
}

export interface PublicacionNuevaPayload {
  tenantId: string
  publicacionId: string
  titulo?: string
  tipo: string
  etiquetas: string[]
  fecha: string
}

export interface PreguntaTiendaPayload {
  tiendaId: string
  preguntaId: string
  userId: string
  tenantId: string
  fecha: string
}

export interface SeguidorTiendaPayload {
  tiendaId: string
  userId: string
  tenantId: string
  fecha: string
}

export interface ISocialNotificador {
  reaccionCreada(tenantId: string, payload: ReaccionPayload): void
  comentarioCreado(tenantId: string, payload: ComentarioPayload): void
  valoracionCreada(tenantId: string, payload: ValoracionPayload): void
  publicacionNueva(tenantId: string, payload: PublicacionNuevaPayload): void
  preguntaTiendaNueva(tenantId: string, payload: PreguntaTiendaPayload): void
  seguidorTiendaNuevo(tenantId: string, payload: SeguidorTiendaPayload): void
}
