import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol, ROLES_ALMACEN } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { IngresoAlmacenPrismaRepository } from "../infrastructure/ingreso-almacen.prisma.repository.js"
import { SalidaAlmacenPrismaRepository } from "../infrastructure/salida-almacen.prisma.repository.js"
import { RecuentoAlmacenPrismaRepository } from "../infrastructure/recuento-almacen.prisma.repository.js"
import { InsumosPrismaRepository } from "../infrastructure/insumo.prisma.repository.js"
import { CrearIngresoUseCase } from "../application/almacen/crear-ingreso.usecase.js"
import { ListarIngresosUseCase } from "../application/almacen/listar-ingresos.usecase.js"
import { ObtenerIngresoUseCase } from "../application/almacen/obtener-ingreso.usecase.js"
import { ActualizarIngresoUseCase } from "../application/almacen/actualizar-ingreso.usecase.js"
import { AprobarIngresoUseCase } from "../application/almacen/aprobar-ingreso.usecase.js"
import { CrearSalidaUseCase } from "../application/almacen/crear-salida.usecase.js"
import { ListarSalidasUseCase } from "../application/almacen/listar-salidas.usecase.js"
import { ObtenerSalidaUseCase } from "../application/almacen/obtener-salida.usecase.js"
import { ActualizarSalidaUseCase } from "../application/almacen/actualizar-salida.usecase.js"
import { AprobarSalidaUseCase } from "../application/almacen/aprobar-salida.usecase.js"
import { RegistrarRecuentoAlmacenUseCase } from "../application/almacen/registrar-recuento-almacen.usecase.js"
import { ListarRecuentosAlmacenUseCase } from "../application/almacen/listar-recuentos-almacen.usecase.js"
import {
  CrearIngresoSchema,
  CrearSalidaSchema,
  ActualizarIngresoSchema,
  ActualizarSalidaSchema,
  AprobarDocumentoSchema,
  RecuentoAlmacenSchema,
  QueryParamsAlmacenSchema,
} from "./almacen.schema.js"
import {
  InsumoNoEncontradoError,
  ProveedorNoEncontradoError,
  DetalleVacioError,
  ConflictoVersionError,
  DocumentoYaAprobadoError,
  DocumentoNoEncontradoError,
  StockNegativoInsumoError,
} from "../domain/almacen.errors.js"
import { getAlmacenNotificador } from "../infrastructure/almacen.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const almacenOperacionesRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

// ─── Ingresos ────────────────────────────────────────────────────────────────

almacenOperacionesRouter.openapi(
  createRoute({
    method: "get",
    path: "/ingresos",
    operationId: "almacen_listar_ingresos",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de ingresos", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsAlmacenSchema.parse(c.req.query())
    const result = await new ListarIngresosUseCase(new IngresoAlmacenPrismaRepository(db)).execute(tenantId, params)
    return c.json(result)
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "post",
    path: "/ingresos",
    operationId: "almacen_crear_ingreso",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ALMACEN),
    request: { body: { content: { "application/json": { schema: CrearIngresoSchema } } } },
    responses: {
      201: createdResponse("Ingreso creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearIngresoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CrearIngresoUseCase(
        new IngresoAlmacenPrismaRepository(db),
        new InsumosPrismaRepository(db),
        db
      ).execute({
        tenantId,
        proveedorId: parsed.data.proveedorId,
        descripcion: parsed.data.descripcion,
        detalles: parsed.data.detalles.map((d) => ({
          ...d,
          fechaVencimiento: d.fechaVencimiento ? new Date(d.fechaVencimiento) : undefined,
        })),
        createdById: session.user.id,
        tenantMemberId: c.get("miembro").id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
      if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "get",
    path: "/ingresos/{ingresoId}",
    operationId: "almacen_obtener_ingreso",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ ingresoId: z.string() }) },
    responses: {
      200: okResponse("Ingreso", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerIngresoUseCase(new IngresoAlmacenPrismaRepository(db)).execute(
        c.req.param("ingresoId"),
        tenantId
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "patch",
    path: "/ingresos/{ingresoId}",
    operationId: "almacen_actualizar_ingreso",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ALMACEN),
    request: {
      params: z.object({ ingresoId: z.string() }),
      body: { content: { "application/json": { schema: ActualizarIngresoSchema } } },
    },
    responses: {
      200: okResponse("Ingreso actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarIngresoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarIngresoUseCase(new IngresoAlmacenPrismaRepository(db)).execute(
        c.req.param("ingresoId"),
        tenantId,
        {
          ...parsed.data,
          detalles: parsed.data.detalles?.map((d) => ({
            ...d,
            fechaVencimiento: d.fechaVencimiento ? new Date(d.fechaVencimiento) : undefined,
          })),
          updatedById: session.user.id,
        }
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof DocumentoYaAprobadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "post",
    path: "/ingresos/{ingresoId}/aprobar",
    operationId: "almacen_aprobar_ingreso",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ALMACEN),
    request: {
      params: z.object({ ingresoId: z.string() }),
      body: { content: { "application/json": { schema: AprobarDocumentoSchema } } },
    },
    responses: {
      200: okResponse("Ingreso aprobado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = AprobarDocumentoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new AprobarIngresoUseCase(
        new IngresoAlmacenPrismaRepository(db),
        getAlmacenNotificador()
      ).execute({
        ingresoId: c.req.param("ingresoId"),
        tenantId,
        version: parsed.data.version,
        aprobadoPorId: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof DocumentoYaAprobadoError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ConflictoVersionError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// ─── Salidas ─────────────────────────────────────────────────────────────────

almacenOperacionesRouter.openapi(
  createRoute({
    method: "get",
    path: "/salidas",
    operationId: "almacen_listar_salidas",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de salidas", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsAlmacenSchema.parse(c.req.query())
    const result = await new ListarSalidasUseCase(new SalidaAlmacenPrismaRepository(db)).execute(tenantId, params)
    return c.json(result)
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "post",
    path: "/salidas",
    operationId: "almacen_crear_salida",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ALMACEN),
    request: { body: { content: { "application/json": { schema: CrearSalidaSchema } } } },
    responses: {
      201: createdResponse("Salida creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearSalidaSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CrearSalidaUseCase(
        new SalidaAlmacenPrismaRepository(db),
        new InsumosPrismaRepository(db)
      ).execute({
        tenantId,
        motivo: parsed.data.motivo,
        descripcion: parsed.data.descripcion,
        detalles: parsed.data.detalles,
        createdById: session.user.id,
        tenantMemberId: c.get("miembro").id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "get",
    path: "/salidas/{salidaId}",
    operationId: "almacen_obtener_salida",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ salidaId: z.string() }) },
    responses: {
      200: okResponse("Salida", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerSalidaUseCase(new SalidaAlmacenPrismaRepository(db)).execute(
        c.req.param("salidaId"),
        tenantId
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "patch",
    path: "/salidas/{salidaId}",
    operationId: "almacen_actualizar_salida",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ALMACEN),
    request: {
      params: z.object({ salidaId: z.string() }),
      body: { content: { "application/json": { schema: ActualizarSalidaSchema } } },
    },
    responses: {
      200: okResponse("Salida actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarSalidaSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarSalidaUseCase(new SalidaAlmacenPrismaRepository(db)).execute(
        c.req.param("salidaId"),
        tenantId,
        { ...parsed.data, updatedById: session.user.id }
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof DocumentoYaAprobadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "post",
    path: "/salidas/{salidaId}/aprobar",
    operationId: "almacen_aprobar_salida",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ALMACEN),
    request: {
      params: z.object({ salidaId: z.string() }),
      body: { content: { "application/json": { schema: AprobarDocumentoSchema } } },
    },
    responses: {
      200: okResponse("Salida aprobada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = AprobarDocumentoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new AprobarSalidaUseCase(
        new SalidaAlmacenPrismaRepository(db),
        getAlmacenNotificador()
      ).execute({
        salidaId: c.req.param("salidaId"),
        tenantId,
        version: parsed.data.version,
        aprobadoPorId: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof DocumentoYaAprobadoError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ConflictoVersionError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof StockNegativoInsumoError)
        return c.json({ error: err.code, message: err.message, insumoId: err.insumoId, stockResultante: err.stockResultante }, 422)
      throw err
    }
  },
)

// ─── Recuentos ───────────────────────────────────────────────────────────────

almacenOperacionesRouter.openapi(
  createRoute({
    method: "get",
    path: "/recuentos",
    operationId: "almacen_listar_recuentos_almacen",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de recuentos de almacén", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsAlmacenSchema.parse(c.req.query())
    const result = await new ListarRecuentosAlmacenUseCase(new RecuentoAlmacenPrismaRepository(db)).execute(tenantId, params)
    return c.json(result)
  },
)

almacenOperacionesRouter.openapi(
  createRoute({
    method: "post",
    path: "/recuentos",
    operationId: "almacen_registrar_recuento_almacen",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ALMACEN),
    request: { body: { content: { "application/json": { schema: RecuentoAlmacenSchema } } } },
    responses: {
      201: createdResponse("Recuento de almacén registrado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = RecuentoAlmacenSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new RegistrarRecuentoAlmacenUseCase(
        new RecuentoAlmacenPrismaRepository(db),
        new InsumosPrismaRepository(db),
        getAlmacenNotificador()
      ).execute({
        tenantId,
        observacion: parsed.data.observacion,
        detalles: parsed.data.detalles,
        createdById: session.user.id,
        tenantMemberId: c.get("miembro").id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
