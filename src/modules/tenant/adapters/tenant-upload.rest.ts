import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { requireAuth, requireTenantActivo, type HonoEnv } from "../../../core/hono-context.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"
import { GenerarUrlSubidaUseCase } from "../application/generar-url-subida.usecase.js"
import { getAlmacenamientoPort } from "../infrastructure/almacenamiento.port.provider.js"
import { PropositoInvalido, TipoMimeNoPermitido, TamanoExcedido } from "../domain/tenant-upload.errors.js"
import { SolicitudUploadUrlSchema, UploadUrlResponseSchema } from "./tenant-upload.schema.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export const tenantUploadRouter = new OpenAPIHono<HonoEnv>()

// ─── POST /api/tenant/upload-url ───────────────────────────────────────────────

tenantUploadRouter.openapi(
  createRoute({
    method: "post",
    path: "/upload-url",
    operationId: "tenant_generar_url_subida",
    tags: ["Tenant"],
    security: [{ bearerAuth: [] }],
    middleware: [requireAuth, requireTenantActivo] as const,
    request: {
      body: { content: { "application/json": { schema: SolicitudUploadUrlSchema } } },
    },
    responses: {
      200: okResponse("URL de subida prefirmada + URL pública final", UploadUrlResponseSchema),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = SolicitudUploadUrlSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: "VALIDACION", message: "Body inválido", details: parsed.error.flatten() }, 400)
    }

    const almacenamiento = getAlmacenamientoPort()
    if (!almacenamiento) {
      logger.error("[tenant-upload] IAlmacenamientoPort no configurado")
      return c.json({ error: "INTERNAL_ERROR", message: "Almacenamiento no configurado" }, 500)
    }

    const useCase = new GenerarUrlSubidaUseCase(almacenamiento)

    try {
      const resultado = await useCase.ejecutar({ tenantId, ...parsed.data })

      logger.info(
        {
          tenantId,
          userId: session.user.id,
          tipo: parsed.data.tipo,
          filename: parsed.data.filename,
          contentType: parsed.data.contentType,
          size: parsed.data.size,
        },
        "[tenant-upload] url de subida emitida",
      )

      return c.json(resultado, 200)
    } catch (err) {
      if (err instanceof PropositoInvalido) {
        return c.json({ error: err.code, message: err.message }, 400)
      }
      if (err instanceof TipoMimeNoPermitido) {
        return c.json({ error: err.code, message: err.message }, 400)
      }
      if (err instanceof TamanoExcedido) {
        return c.json({ error: err.code, message: err.message }, 400)
      }
      throw err
    }
  },
)
