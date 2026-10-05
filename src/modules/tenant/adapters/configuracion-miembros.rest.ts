import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"
import { MiembrosPrismaRepository } from "../infrastructure/miembros.prisma.repository.js"
import { ResendNotificadorInvitacion } from "../infrastructure/resend.notificador-invitacion.js"
import { getTenantNotificador } from "../infrastructure/tenant.notificador.provider.js"
import { InvitarMiembroUseCase } from "../application/configuracion/invitar-miembro.usecase.js"
import { CancelarInvitacionUseCase } from "../application/configuracion/cancelar-invitacion.usecase.js"
import { CambiarRolMiembroUseCase } from "../application/configuracion/cambiar-rol-miembro.usecase.js"
import { QuitarMiembroUseCase } from "../application/configuracion/quitar-miembro.usecase.js"
import {
  ESCRITURA,
  IdParamSchema,
  InvitarSchema,
  CambiarRolSchema,
  MiembroSchema,
  InvitacionSchema,
  responderError,
} from "./configuracion.schema.js"

// Los guards van en cada ruta (`middleware` de createRoute), no en `.use("*")`:
// montado en /api/tenant, un `.use("*")` alcanzaría también a las rutas de los
// otros routers de ese prefijo, como `GET /api/tenant`, que no exige negocio activo.
export const configuracionMiembrosRouter = new OpenAPIHono<HonoEnv>()

const repo = () => new MiembrosPrismaRepository(prisma)
const correo = new ResendNotificadorInvitacion()
const TAGS = ["Tenant · Miembros"]

configuracionMiembrosRouter.openapi(
  createRoute({
    method: "post",
    path: "/invitaciones",
    operationId: "tenant_invitar_miembro",
    tags: TAGS,
    security: [{ bearerAuth: [] }],
    middleware: ESCRITURA,
    request: { body: { content: { "application/json": { schema: InvitarSchema } } } },
    responses: { 201: createdResponse("Invitación creada y enviada", InvitacionSchema), ...errorResponses },
  }),
  async (c) => {
    try {
      const body = c.req.valid("json")
      const inv = await new InvitarMiembroUseCase(repo(), correo).ejecutar({
        tenantId: c.get("tenantId"),
        actorUserId: c.get("session").user.id,
        email: body.email,
        rol: body.rol,
      })
      return c.json(inv, 201)
    } catch (err) {
      return responderError(c, err)
    }
  },
)

configuracionMiembrosRouter.openapi(
  createRoute({
    method: "delete",
    path: "/invitaciones/{id}",
    operationId: "tenant_cancelar_invitacion",
    tags: TAGS,
    security: [{ bearerAuth: [] }],
    middleware: ESCRITURA,
    request: { params: IdParamSchema },
    responses: { 204: { description: "Invitación cancelada" }, ...errorResponses },
  }),
  async (c) => {
    try {
      await new CancelarInvitacionUseCase(repo()).ejecutar(c.get("tenantId"), c.req.valid("param").id)
      return c.body(null, 204)
    } catch (err) {
      return responderError(c, err)
    }
  },
)

configuracionMiembrosRouter.openapi(
  createRoute({
    method: "patch",
    path: "/miembros/{id}/rol",
    operationId: "tenant_cambiar_rol_miembro",
    tags: TAGS,
    security: [{ bearerAuth: [] }],
    middleware: ESCRITURA,
    request: { params: IdParamSchema, body: { content: { "application/json": { schema: CambiarRolSchema } } } },
    responses: { 200: okResponse("Miembro con el rol nuevo", MiembroSchema), ...errorResponses },
  }),
  async (c) => {
    try {
      const m = await new CambiarRolMiembroUseCase(repo()).ejecutar({
        tenantId: c.get("tenantId"),
        actorUserId: c.get("session").user.id,
        miembroId: c.req.valid("param").id,
        rol: c.req.valid("json").rol,
      })
      return c.json(m)
    } catch (err) {
      return responderError(c, err)
    }
  },
)

configuracionMiembrosRouter.openapi(
  createRoute({
    method: "delete",
    path: "/miembros/{id}",
    operationId: "tenant_quitar_miembro",
    tags: TAGS,
    security: [{ bearerAuth: [] }],
    middleware: ESCRITURA,
    request: { params: IdParamSchema },
    responses: { 204: { description: "Miembro quitado; pierde el acceso en su próxima request" }, ...errorResponses },
  }),
  async (c) => {
    try {
      await new QuitarMiembroUseCase(repo(), getTenantNotificador()).ejecutar({
        tenantId: c.get("tenantId"),
        actorUserId: c.get("session").user.id,
        miembroId: c.req.valid("param").id,
      })
      return c.body(null, 204)
    } catch (err) {
      return responderError(c, err)
    }
  },
)

