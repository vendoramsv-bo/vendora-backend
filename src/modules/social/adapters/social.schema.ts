import { z } from "zod"
import { makeQueryParamsSchema } from "../../../core/query-params.js"

export const ReaccionProductoSchema = z.object({
  emoji: z.string().min(1).max(10),
})

export const ReaccionTipoSchema = z.object({
  tipo: z.enum(["ME_GUSTA", "ME_ENCANTA", "ME_IMPORTA", "ME_DIVIERTE", "ME_ASOMBRA", "ME_ENTRISTECE", "ME_ENOJA"]),
})

export const ComentarioSchema = z.object({
  contenido: z.string().min(1).max(2000),
  padreId: z.string().optional(),
})

export const ValoracionSchema = z.object({
  puntuacion: z.number().int().min(1).max(5),
  resena: z.string().max(2000).optional(),
})

export const PreguntaSchema = z.object({
  pregunta: z.string().min(1).max(1000),
})

export const RespuestaSchema = z.object({
  respuesta: z.string().min(1).max(2000),
})

export const CompartirSchema = z.object({
  plataforma: z.enum(["WHATSAPP", "FACEBOOK", "TWITTER_X", "INSTAGRAM", "TIKTOK", "TELEGRAM", "COPIAR_ENLACE", "OTRO"]),
})

export const MediaSchema = z.object({
  tipo: z.enum(["IMAGEN", "VIDEO", "VIDEO_YOUTUBE", "VIDEO_TIKTOK", "VIDEO_FACEBOOK", "VIDEO_INSTAGRAM", "VIDEO_OTRO"]),
  url: z.string().url().optional(),
  embedUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  plataforma: z.enum(["YOUTUBE", "TIKTOK", "FACEBOOK", "INSTAGRAM", "OTRO"]).optional(),
  titulo: z.string().max(200).optional(),
  orden: z.number().int().min(0).default(0),
})

export const CrearPublicacionSchema = z.object({
  titulo: z.string().max(200).optional(),
  contenido: z.string().max(10000).optional(),
  tipo: z.enum(["TEXTO", "IMAGEN", "VIDEO", "VIDEO_EXTERNO", "MIXTO"]),
  etiquetas: z.array(z.string().max(50)).max(20).optional().default([]),
  medios: z.array(MediaSchema).optional().default([]),
})

export const ActualizarPublicacionSchema = CrearPublicacionSchema.partial()

export const EstadoPublicacionSchema = z.object({
  estado: z.enum(["PUBLICADO", "ARCHIVADO"]),
})

export const QueryComentariosSchema = makeQueryParamsSchema(["createdAt"])
export const QueryValoracionesSchema = makeQueryParamsSchema(["createdAt", "puntuacion"])
export const QueryPreguntasSchema = makeQueryParamsSchema(["createdAt"])
export const QueryPublicacionesSchema = makeQueryParamsSchema(["createdAt"])
export const QueryFavoritosSchema = makeQueryParamsSchema(["createdAt"])
