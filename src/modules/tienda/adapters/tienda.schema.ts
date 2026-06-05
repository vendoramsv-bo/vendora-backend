import { z } from "zod"

export const ActualizarConfiguracionSchema = z.object({
  tipoDespliegueVentas: z.enum(["BARRA_LATERAL", "BARRA_SUPERIOR", "BARRA_INFERIOR"]).optional(),
  tema: z.string().min(1).optional(),
  tipoLineado: z.string().min(1).optional(),
})

export const AgregarDestacadoSchema = z.object({
  productoId: z.string().min(1),
  orden: z.number().int().min(0).optional(),
})

export const ReordenarDestacadosSchema = z.object({
  orden: z.array(z.string().min(1)).min(1),
})

export const DirectorioQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  actividadEconomicaId: z.string().optional(),
  categoriaId: z.string().optional(),
  busqueda: z.string().optional(),
  ordenarPor: z.enum(["puntuacion", "seguidores", "createdAt", "distancia"]).optional(),
  orden: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const CatalogoPublicoQuerySchema = z.object({
  categoriaId: z.string().optional(),
  busqueda: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ordenarPor: z.enum(["nombre", "precio", "createdAt"]).optional(),
  orden: z.enum(["asc", "desc"]).optional(),
})
