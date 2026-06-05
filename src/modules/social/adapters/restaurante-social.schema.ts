import { z } from "zod"

export const ReaccionRestauranteSchema = z.object({
  tipo: z.enum(["ME_GUSTA", "ME_ENCANTA", "ME_IMPORTA", "ME_DIVIERTE", "ME_ASOMBRA", "ME_ENTRISTECE", "ME_ENOJA"]),
})

export const ComentarioRestauranteSchema = z.object({
  contenido: z.string().min(1).max(2000),
  padreId: z.string().optional(),
})

export const ValoracionRestauranteSchema = z.object({
  puntuacion: z.number().int().min(1).max(5),
  resena: z.string().max(2000).optional(),
})

export const PreguntaRestauranteSchema = z.object({
  pregunta: z.string().min(1).max(1000),
})

export const RespuestaPreguntaRestauranteSchema = z.object({
  respuesta: z.string().min(1).max(2000),
})

export const NovedadRestauranteSchema = z.object({
  titulo: z.string().max(200).optional(),
  contenido: z.string().min(1).max(10000),
  tipo: z.enum(["TEXTO", "IMAGEN", "VIDEO", "VIDEO_EXTERNO", "MIXTO"]),
  etiquetas: z.array(z.string().max(50)).max(20).optional().default([]),
  medios: z
    .array(
      z.object({
        tipo: z.enum(["IMAGEN", "VIDEO", "VIDEO_YOUTUBE", "VIDEO_TIKTOK", "VIDEO_FACEBOOK", "VIDEO_INSTAGRAM", "VIDEO_OTRO"]),
        url: z.string().url().optional(),
        embedUrl: z.string().url().optional(),
      }),
    )
    .optional()
    .default([]),
})
