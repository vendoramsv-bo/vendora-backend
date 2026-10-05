import { OpenAPIHono, createRoute, type z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { errorResponses, okResponse, createdResponse, paginadoSchema } from "../../../core/openapi-responses.js"
import type { IListaOrdenadaRepository } from "../domain/ports/IListaOrdenadaRepository.js"
import { DescripcionPrismaRepository } from "../infrastructure/descripcion.prisma.repository.js"
import { ImagenLocalPrismaRepository } from "../infrastructure/imagen-local.prisma.repository.js"
import { EquipoPrismaRepository } from "../infrastructure/equipo.prisma.repository.js"
import {
  ListarElementosUseCase,
  CrearElementoUseCase,
  EditarElementoUseCase,
  BorrarElementoUseCase,
  ReordenarElementosUseCase,
} from "../application/configuracion/lista-ordenada.usecases.js"
import {
  LECTURA,
  ESCRITURA,
  IdParamSchema,
  ReordenarSchema,
  QueryListaOrdenadaSchema,
  QueryListaOrdenadaSinBusquedaSchema,
  DescripcionSchema,
  CrearDescripcionSchema,
  ImagenLocalSchema,
  CrearImagenSchema,
  MiembroEquipoSchema,
  CrearEquipoSchema,
  EditarEquipoSchema,
  responderError,
} from "./configuracion.schema.js"

// Los guards van en cada ruta (`middleware` de createRoute), no en `.use("*")`:
// montado en /api/tenant, un `.use("*")` alcanzaría también a las rutas de los
// otros routers de ese prefijo, como `GET /api/tenant`, que no exige negocio activo.
export const configuracionContenidoRouter = new OpenAPIHono<HonoEnv>()

interface ConfigLista {
  path: string
  recurso: string
  operacion: string
  tag: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repo: () => IListaOrdenadaRepository<any, any, any>
  query: z.AnyZodObject
  item: z.ZodTypeAny
  crear: z.ZodTypeAny
  /** Sin edición: la pantalla de imágenes no edita. */
  editar?: z.ZodTypeAny
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any

// El orden de registro importa: `PATCH /x/reorder` va antes que `PATCH /x/{id}`,
// o Hono toma "reorder" como un id.
function registrarListaOrdenada(cfg: ConfigLista) {
  const r = configuracionContenidoRouter
  const base = { tags: [cfg.tag], security: [{ bearerAuth: [] }] }
  const lista = paginadoSchema(cfg.item)

  r.openapi(
    createRoute({
      ...base,
      method: "get",
      path: cfg.path,
      operationId: `tenant_listar_${cfg.operacion}`,
      middleware: LECTURA,
      request: { query: cfg.query },
      responses: { 200: okResponse(`${cfg.recurso}: lista en su orden`, lista), ...errorResponses },
    }),
    async (c: Ctx) => c.json(await new ListarElementosUseCase(cfg.repo()).ejecutar(c.get("tenantId"), c.req.valid("query"))),
  )

  r.openapi(
    createRoute({
      ...base,
      method: "post",
      path: cfg.path,
      operationId: `tenant_crear_${cfg.operacion}`,
      middleware: ESCRITURA,
      request: { body: { content: { "application/json": { schema: cfg.crear } } } },
      responses: { 201: createdResponse(`${cfg.recurso} creado, al final de la lista`, cfg.item), ...errorResponses },
    }),
    async (c: Ctx) => {
      try {
        return c.json(await new CrearElementoUseCase(cfg.repo()).ejecutar(c.get("tenantId"), c.req.valid("json")), 201)
      } catch (err) {
        return responderError(c, err)
      }
    },
  )

  r.openapi(
    createRoute({
      ...base,
      method: "patch",
      path: `${cfg.path}/reorder`,
      operationId: `tenant_reordenar_${cfg.operacion}`,
      middleware: ESCRITURA,
      request: { body: { content: { "application/json": { schema: ReordenarSchema } } } },
      responses: { 200: okResponse(`${cfg.recurso}: lista completa reordenada`, lista), ...errorResponses },
    }),
    async (c: Ctx) => {
      try {
        return c.json(await new ReordenarElementosUseCase(cfg.repo()).ejecutar(c.get("tenantId"), c.req.valid("json").ids))
      } catch (err) {
        return responderError(c, err)
      }
    },
  )

  if (cfg.editar) {
    r.openapi(
      createRoute({
        ...base,
        method: "patch",
        path: `${cfg.path}/{id}`,
        operationId: `tenant_editar_${cfg.operacion}`,
        middleware: ESCRITURA,
        request: { params: IdParamSchema, body: { content: { "application/json": { schema: cfg.editar } } } },
        responses: { 200: okResponse(`${cfg.recurso} actualizado`, cfg.item), ...errorResponses },
      }),
      async (c: Ctx) => {
        try {
          return c.json(
            await new EditarElementoUseCase(cfg.repo(), cfg.recurso).ejecutar(c.get("tenantId"), c.req.valid("param").id, c.req.valid("json")),
          )
        } catch (err) {
          return responderError(c, err)
        }
      },
    )
  }

  r.openapi(
    createRoute({
      ...base,
      method: "delete",
      path: `${cfg.path}/{id}`,
      operationId: `tenant_borrar_${cfg.operacion}`,
      middleware: ESCRITURA,
      request: { params: IdParamSchema },
      responses: { 204: { description: `${cfg.recurso} borrado` }, ...errorResponses },
    }),
    async (c: Ctx) => {
      try {
        await new BorrarElementoUseCase(cfg.repo(), cfg.recurso).ejecutar(c.get("tenantId"), c.req.valid("param").id)
        return c.body(null, 204)
      } catch (err) {
        return responderError(c, err)
      }
    },
  )
}

registrarListaOrdenada({
  path: "/descripciones",
  recurso: "Descripción",
  operacion: "descripcion",
  tag: "Tenant · Contenido",
  repo: () => new DescripcionPrismaRepository(prisma),
  query: QueryListaOrdenadaSinBusquedaSchema,
  item: DescripcionSchema,
  crear: CrearDescripcionSchema,
  editar: CrearDescripcionSchema,
})

registrarListaOrdenada({
  path: "/imagenes-local",
  recurso: "Imagen del local",
  operacion: "imagen_local",
  tag: "Tenant · Contenido",
  repo: () => new ImagenLocalPrismaRepository(prisma),
  query: QueryListaOrdenadaSinBusquedaSchema,
  item: ImagenLocalSchema,
  crear: CrearImagenSchema,
})

registrarListaOrdenada({
  path: "/equipo",
  recurso: "Miembro del equipo",
  operacion: "miembro_equipo",
  tag: "Tenant · Contenido",
  repo: () => new EquipoPrismaRepository(prisma),
  query: QueryListaOrdenadaSchema,
  item: MiembroEquipoSchema,
  crear: CrearEquipoSchema,
  editar: EditarEquipoSchema,
})
