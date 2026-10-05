import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { errorResponses, okResponse, createdResponse, paginadoSchema } from "../../../core/openapi-responses.js"
import { LocalizacionPrismaRepository } from "../infrastructure/localizacion.prisma.repository.js"
import { PropietarioPrismaRepository } from "../infrastructure/propietario.prisma.repository.js"
import {
  ListarLocalizacionesUseCase,
  CrearLocalizacionUseCase,
  EditarLocalizacionUseCase,
  BorrarLocalizacionUseCase,
} from "../application/configuracion/localizaciones.usecases.js"
import { ObtenerPropietarioUseCase, EditarPropietarioUseCase } from "../application/configuracion/propietario.usecases.js"
import {
  LECTURA,
  ESCRITURA,
  IdParamSchema,
  QueryListaSchema,
  LocalizacionSchema,
  CrearLocalizacionSchema,
  EditarLocalizacionSchema,
  PropietarioSchema,
  EditarPropietarioSchema,
  SOLO_PROPIETARIO,
  TipoVerticalParamSchema,
  CapacidadSchema,
  CambiarCapacidadSchema,
  responderError,
} from "./configuracion.schema.js"
import { MiembrosPrismaRepository } from "../infrastructure/miembros.prisma.repository.js"
import { obtenerActivadorVertical } from "../infrastructure/activador-vertical.provider.js"
import { ObtenerCapacidadesUseCase, CambiarCapacidadUseCase } from "../application/configuracion/capacidades.usecases.js"

// Los guards van en cada ruta (`middleware` de createRoute), no en `.use("*")`:
// montado en /api/tenant, un `.use("*")` alcanzaría también a las rutas de los
// otros routers de ese prefijo, como `GET /api/tenant`, que no exige negocio activo.
export const configuracionNegocioRouter = new OpenAPIHono<HonoEnv>()

const SEGURIDAD = { security: [{ bearerAuth: [] }] }
const localizaciones = () => new LocalizacionPrismaRepository(prisma)
const propietarios = () => new PropietarioPrismaRepository(prisma)

// ─── Localizaciones (US3) ─────────────────────────────────────────────────────

configuracionNegocioRouter.openapi(
  createRoute({
    ...SEGURIDAD,
    method: "get",
    path: "/localizaciones",
    operationId: "tenant_listar_localizaciones",
    tags: ["Tenant · Negocio"],
    middleware: LECTURA,
    request: { query: QueryListaSchema },
    responses: { 200: okResponse("Localizaciones del negocio", paginadoSchema(LocalizacionSchema)), ...errorResponses },
  }),
  async (c) => c.json(await new ListarLocalizacionesUseCase(localizaciones()).ejecutar(c.get("tenantId"), c.req.valid("query"))),
)

configuracionNegocioRouter.openapi(
  createRoute({
    ...SEGURIDAD,
    method: "post",
    path: "/localizaciones",
    operationId: "tenant_crear_localizacion",
    tags: ["Tenant · Negocio"],
    middleware: ESCRITURA,
    request: { body: { content: { "application/json": { schema: CrearLocalizacionSchema } } } },
    responses: { 201: createdResponse("Localización creada", LocalizacionSchema), ...errorResponses },
  }),
  async (c) => c.json(await new CrearLocalizacionUseCase(localizaciones()).ejecutar(c.get("tenantId"), c.req.valid("json")), 201),
)

configuracionNegocioRouter.openapi(
  createRoute({
    ...SEGURIDAD,
    method: "patch",
    path: "/localizaciones/{id}",
    operationId: "tenant_editar_localizacion",
    tags: ["Tenant · Negocio"],
    middleware: ESCRITURA,
    request: { params: IdParamSchema, body: { content: { "application/json": { schema: EditarLocalizacionSchema } } } },
    responses: { 200: okResponse("Localización actualizada", LocalizacionSchema), ...errorResponses },
  }),
  async (c) => {
    try {
      return c.json(
        await new EditarLocalizacionUseCase(localizaciones()).ejecutar(c.get("tenantId"), c.req.valid("param").id, c.req.valid("json")),
      )
    } catch (err) {
      return responderError(c, err)
    }
  },
)

configuracionNegocioRouter.openapi(
  createRoute({
    ...SEGURIDAD,
    method: "delete",
    path: "/localizaciones/{id}",
    operationId: "tenant_borrar_localizacion",
    tags: ["Tenant · Negocio"],
    middleware: ESCRITURA,
    request: { params: IdParamSchema },
    responses: { 204: { description: "Localización borrada" }, ...errorResponses },
  }),
  async (c) => {
    try {
      await new BorrarLocalizacionUseCase(localizaciones()).ejecutar(c.get("tenantId"), c.req.valid("param").id)
      return c.body(null, 204)
    } catch (err) {
      return responderError(c, err)
    }
  },
)

// ─── Propietario (US4 — uno por negocio; sin alta ni baja) ────────────────────

configuracionNegocioRouter.openapi(
  createRoute({
    ...SEGURIDAD,
    method: "get",
    path: "/propietarios",
    operationId: "tenant_obtener_propietario",
    tags: ["Tenant · Negocio"],
    middleware: LECTURA,
    responses: { 200: okResponse("El propietario del negocio, como lista de un elemento", paginadoSchema(PropietarioSchema)), ...errorResponses },
  }),
  async (c) => c.json(await new ObtenerPropietarioUseCase(propietarios()).ejecutar(c.get("tenantId"))),
)

configuracionNegocioRouter.openapi(
  createRoute({
    ...SEGURIDAD,
    method: "patch",
    path: "/propietarios/{id}",
    operationId: "tenant_editar_propietario",
    tags: ["Tenant · Negocio"],
    middleware: ESCRITURA,
    request: { params: IdParamSchema, body: { content: { "application/json": { schema: EditarPropietarioSchema } } } },
    responses: { 200: okResponse("Propietario actualizado", PropietarioSchema), ...errorResponses },
  }),
  async (c) => {
    try {
      return c.json(
        await new EditarPropietarioUseCase(propietarios()).ejecutar(
          c.get("tenantId"),
          c.req.valid("param").id,
          c.req.valid("json"),
          c.get("session").user.id,
        ),
      )
    } catch (err) {
      return responderError(c, err)
    }
  },
)

// ─── Capacidades (US5 — escritura solo PROPIETARIO) ──────────────────────────

configuracionNegocioRouter.openapi(
  createRoute({
    ...SEGURIDAD,
    method: "get",
    path: "/capabilities",
    operationId: "tenant_listar_capacidades",
    tags: ["Tenant · Negocio"],
    middleware: LECTURA,
    responses: { 200: okResponse("Verticales del negocio y si están activas", z.object({ data: z.array(CapacidadSchema) })), ...errorResponses },
  }),
  async (c) => c.json(await new ObtenerCapacidadesUseCase(new MiembrosPrismaRepository(prisma)).ejecutar(c.get("tenantId"))),
)

configuracionNegocioRouter.openapi(
  createRoute({
    ...SEGURIDAD,
    method: "patch",
    path: "/capabilities/{tipo}",
    operationId: "tenant_cambiar_capacidad",
    tags: ["Tenant · Negocio"],
    middleware: SOLO_PROPIETARIO,
    request: { params: TipoVerticalParamSchema, body: { content: { "application/json": { schema: CambiarCapacidadSchema } } } },
    responses: { 200: okResponse("Vertical activada o desactivada", CapacidadSchema), ...errorResponses },
  }),
  async (c) => {
    try {
      return c.json(
        await new CambiarCapacidadUseCase(new MiembrosPrismaRepository(prisma), obtenerActivadorVertical).ejecutar({
          tenantId: c.get("tenantId"),
          actorUserId: c.get("session").user.id,
          tipo: c.req.valid("param").tipo,
          activa: c.req.valid("json").activa,
        }),
      )
    } catch (err) {
      return responderError(c, err)
    }
  },
)
