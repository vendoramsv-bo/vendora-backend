import { z } from "@hono/zod-openapi"

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export function okResponse(description: string, schema: z.ZodTypeAny) {
  return {
    description,
    content: { "application/json": { schema } },
  }
}

export function createdResponse(description: string, schema: z.ZodTypeAny) {
  return {
    description,
    content: { "application/json": { schema } },
  }
}

// Forma exacta de `paginate()` (core/query-params.ts). Si una cambia, la otra también.
export function paginadoSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    take: z.number().int(),
    totalPaginas: z.number().int(),
    hayPaginaSiguiente: z.boolean(),
    hayPaginaAnterior: z.boolean(),
  })
}

export const errorResponses = {
  400: { description: "Solicitud inválida" },
  401: { description: "No autenticado" },
  403: { description: "Sin permiso" },
  404: { description: "No encontrado" },
  409: { description: "Conflicto de unicidad" },
  422: { description: "Validación fallida" },
} as const
