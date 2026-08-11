import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol, ROLES_CATALOGO_ESCRITURA } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ProductoPrismaRepository } from "../infrastructure/producto.prisma.repository.js"
import { getAlmacenInventarioPort } from "../../almacen/infrastructure/almacen-inventario.port.provider.js"
import { CrearProductoUseCase } from "../application/producto/crear-producto.usecase.js"
import { ListarProductosUseCase } from "../application/producto/listar-productos.usecase.js"
import { ObtenerProductoUseCase } from "../application/producto/obtener-producto.usecase.js"
import { ActualizarProductoUseCase } from "../application/producto/actualizar-producto.usecase.js"
import { CambiarEstadoProductoUseCase } from "../application/producto/cambiar-estado-producto.usecase.js"
import { VerificarCodigoUseCase } from "../application/producto/verificar-codigo.usecase.js"
import { EliminarProductoUseCase } from "../application/producto/eliminar-producto.usecase.js"
import { GenerarVariantesCartesianoUseCase } from "../application/producto/generar-variantes-cartesiano.usecase.js"
import { AltaMasivaProductosUseCase } from "../application/producto/alta-masiva-productos.usecase.js"
import { CrearAtributoUseCase } from "../application/producto/crear-atributo.usecase.js"
import { AgregarValorAtributoUseCase } from "../application/producto/agregar-valor-atributo.usecase.js"
import { EliminarValorAtributoUseCase } from "../application/producto/eliminar-valor-atributo.usecase.js"
import { CrearVarianteUseCase } from "../application/producto/crear-variante.usecase.js"
import { ActualizarVarianteUseCase } from "../application/producto/actualizar-variante.usecase.js"
import { CrearPrecioVolumenUseCase } from "../application/producto/crear-precio-volumen.usecase.js"
import { CrearOpcionUseCase } from "../application/producto/crear-opcion.usecase.js"
import { ActualizarOpcionUseCase } from "../application/producto/actualizar-opcion.usecase.js"
import { CrearOfertaUseCase } from "../application/producto/crear-oferta.usecase.js"
import { ActualizarOfertaUseCase } from "../application/producto/actualizar-oferta.usecase.js"
import {
  ProductoCreateSchema,
  ProductoUpdateSchema,
  CambiarEstadoSchema,
  QueryParamsCatalogoSchema,
  AtributoCreateSchema,
  AtributoValorCreateSchema,
  VarianteCreateSchema,
  VarianteUpdateSchema,
  PrecioVolumenCreateSchema,
  OpcionCreateSchema,
  OpcionUpdateSchema,
  OfertaCreateSchema,
  OfertaUpdateSchema,
  VerificarCodigoQuerySchema,
  ConfirmarVariantesBodySchema,
  AltaMasivaBodySchema,
} from "./catalogo.schema.js"
import {
  ProductoCodigoDuplicado,
  ProductoNombreDuplicado,
  ProductoNoEncontrado,
  AtributoNombreDuplicado,
  AtributoNoEncontrado,
  AtributoValorDuplicado,
  AtributoValorEnUso,
  VarianteSkuDuplicado,
  VarianteAtributosDuplicados,
  VarianteNoEncontrada,
  OpcionNombreDuplicada,
  OpcionNoEncontrada,
  OfertaSolapada,
  OfertaNoEncontrada,
  PrecioVolumenCantidadDuplicada,
  ProductoConMovimientos,
  AltaMasivaVacia,
  ClaProductoNoEncontrado,
  SinAtributos,
} from "../domain/catalogo.errors.js"
import { getCatalogoNotificador } from "../infrastructure/catalogo.notificador.provider.js"
import { paginate } from "../../../core/query-params.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const productoRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new ProductoPrismaRepository(db)
}

// ─── Productos base ───────────────────────────────────────────────────────────

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos",
    operationId: "catalogo_listar_productos",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista paginada de productos", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsCatalogoSchema.parse(c.req.query())
    const resultado = await new ListarProductosUseCase(makeRepo()).ejecutar(tenantId, params)
    return c.json(paginate(resultado.data.map((p) => p.toJSON()), resultado.total, params))
  },
)

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/verificar-codigo",
    operationId: "catalogo_verificar_codigo",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Resultado de verificación de código", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const queryResult = VerificarCodigoQuerySchema.safeParse(c.req.query())
    if (!queryResult.success) return c.json({ code: "VALIDATION_ERROR", message: "codigo es requerido" }, 400)
    const resultado = await new VerificarCodigoUseCase(makeRepo()).ejecutar(tenantId, queryResult.data.codigo)
    return c.json(resultado)
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/alta-masiva",
    operationId: "catalogo_altaMasiva_productos",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      body: { content: { "application/json": { schema: AltaMasivaBodySchema } } },
    },
    responses: {
      201: createdResponse("Alta masiva de productos", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = AltaMasivaBodySchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const resultado = await new AltaMasivaProductosUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
        parsed.data.claProductoIds,
        tenantId,
        session.user.id,
      )
      return c.json(
        {
          creados: resultado.creados.map((p) => p.toJSON()),
          total: resultado.creados.length,
          categoriasCreadas: resultado.categoriasCreadas,
          unidadesMedidaCreadas: resultado.unidadesMedidaCreadas,
        },
        201,
      )
    } catch (err) {
      if (err instanceof AltaMasivaVacia) return c.json({ code: err.code, message: err.message }, 400)
      if (err instanceof ClaProductoNoEncontrado) return c.json({ code: err.code, message: err.message, ids: err.ids }, 404)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos",
    operationId: "catalogo_crear_producto",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      body: { content: { "application/json": { schema: ProductoCreateSchema } } },
    },
    responses: {
      201: createdResponse("Producto creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ProductoCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const producto = await new CrearProductoUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(parsed.data, tenantId, session.user.id)
      getAlmacenInventarioPort()?.inicializarProducto(tenantId, producto.id).catch(() => {})
      return c.json(producto.toJSON(), 201)
    } catch (err) {
      if (err instanceof ProductoCodigoDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ProductoNombreDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{id}",
    operationId: "catalogo_obtener_producto",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Producto", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const producto = await new ObtenerProductoUseCase(makeRepo()).ejecutar(c.req.param("id"), tenantId)
      return c.json(producto.toJSON())
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "put",
    path: "/productos/{id}",
    operationId: "catalogo_actualizar_producto",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: ProductoUpdateSchema } } },
    },
    responses: {
      200: okResponse("Producto actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ProductoUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const producto = await new ActualizarProductoUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
        c.req.param("id"),
        parsed.data,
        tenantId,
        session.user.id,
      )
      return c.json(producto.toJSON())
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ProductoConMovimientos) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "delete",
    path: "/productos/{id}",
    operationId: "catalogo_eliminar_producto",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Producto eliminado", z.object({ deleted: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    try {
      await new EliminarProductoUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(c.req.param("id"), tenantId, session.user.id)
      return c.json({ deleted: true })
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/productos/{id}/estado",
    operationId: "catalogo_cambiarEstado_producto",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: CambiarEstadoSchema } } },
    },
    responses: {
      200: okResponse("Estado cambiado", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CambiarEstadoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      await new CambiarEstadoProductoUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
        c.req.param("id"),
        parsed.data.estado,
        tenantId,
        session.user.id,
      )
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{id}/precio-historico",
    operationId: "catalogo_listar_precio_historico",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Historial de precios paginado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsCatalogoSchema.parse(c.req.query())
    const resultado = await makeRepo().listarPrecioHistorico(c.req.param("id"), tenantId, params)
    return c.json(paginate(resultado.data, resultado.total, params))
  },
)

// ─── Atributos ────────────────────────────────────────────────────────────────

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{id}/atributos",
    operationId: "catalogo_listar_atributos",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Lista de atributos", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const atributos = await makeRepo().listarAtributos(c.req.param("id"), tenantId)
    return c.json({ data: atributos })
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{id}/atributos",
    operationId: "catalogo_crear_atributo",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: AtributoCreateSchema } } },
    },
    responses: {
      201: createdResponse("Atributo creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = AtributoCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const atributo = await new CrearAtributoUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data, tenantId)
      return c.json(atributo, 201)
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof AtributoNombreDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{id}/atributos/{attrId}/valores",
    operationId: "catalogo_crear_valor_atributo",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string(), attrId: z.string() }),
      body: { content: { "application/json": { schema: AtributoValorCreateSchema } } },
    },
    responses: {
      201: createdResponse("Valor de atributo creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = AtributoValorCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const valor = await new AgregarValorAtributoUseCase(makeRepo()).ejecutar(
        c.req.param("attrId"),
        parsed.data,
        c.req.param("id"),
        tenantId,
      )
      return c.json(valor, 201)
    } catch (err) {
      if (err instanceof AtributoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof AtributoValorDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "delete",
    path: "/productos/{id}/atributos/{attrId}/valores/{valId}",
    operationId: "catalogo_eliminar_valor_atributo",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: { params: z.object({ id: z.string(), attrId: z.string(), valId: z.string() }) },
    responses: {
      200: okResponse("Valor eliminado", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      await new EliminarValorAtributoUseCase(makeRepo()).ejecutar(c.req.param("valId"), c.req.param("id"))
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof AtributoValorEnUso) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

// ─── Variantes ────────────────────────────────────────────────────────────────

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{id}/variantes",
    operationId: "catalogo_listar_variantes",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Lista de variantes", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const variantes = await makeRepo().listarVariantes(c.req.param("id"), tenantId)
    return c.json({ data: variantes })
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{id}/variantes",
    operationId: "catalogo_crear_variante",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: VarianteCreateSchema } } },
    },
    responses: {
      201: createdResponse("Variante creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = VarianteCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const variante = await new CrearVarianteUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data, tenantId) as { id: string }
      getAlmacenInventarioPort()?.inicializarProducto(tenantId, c.req.param("id"), variante.id).catch(() => {})
      return c.json(variante, 201)
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof VarianteSkuDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof VarianteAtributosDuplicados) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "put",
    path: "/productos/{id}/variantes/{varId}",
    operationId: "catalogo_actualizar_variante",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string(), varId: z.string() }),
      body: { content: { "application/json": { schema: VarianteUpdateSchema } } },
    },
    responses: {
      200: okResponse("Variante actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const body = await c.req.json()
    const parsed = VarianteUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const variante = await new ActualizarVarianteUseCase(makeRepo()).ejecutar(c.req.param("varId"), c.req.param("id"), parsed.data)
      return c.json(variante)
    } catch (err) {
      if (err instanceof VarianteNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof VarianteSkuDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{id}/variantes/propuesta",
    operationId: "catalogo_listar_variantes_propuesta",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Propuesta de variantes cartesiana", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const propuesta = await new GenerarVariantesCartesianoUseCase(makeRepo(), getCatalogoNotificador()).generarPropuesta(
        c.req.param("id"),
        tenantId,
      )
      return c.json({ propuesta, total: propuesta.length })
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof SinAtributos) return c.json({ code: err.code, message: err.message }, 400)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{id}/variantes/confirmar",
    operationId: "catalogo_confirmar_variantes",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: ConfirmarVariantesBodySchema } } },
    },
    responses: {
      201: createdResponse("Variantes confirmadas", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = ConfirmarVariantesBodySchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const creadas = await new GenerarVariantesCartesianoUseCase(makeRepo(), getCatalogoNotificador()).confirmarVariantes(
        c.req.param("id"),
        parsed.data.variantes,
        tenantId,
      )
      return c.json({ creadas, total: creadas.length }, 201)
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof VarianteAtributosDuplicados) return c.json({ code: "VARIANTE_DUPLICADA", message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/productos/{id}/variantes/{varId}/estado",
    operationId: "catalogo_cambiarEstado_variante",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string(), varId: z.string() }),
      body: { content: { "application/json": { schema: CambiarEstadoSchema } } },
    },
    responses: {
      200: okResponse("Estado de variante cambiado", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CambiarEstadoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    await makeRepo().cambiarEstadoVariante(c.req.param("varId"), c.req.param("id"), parsed.data.estado, session.user.id)
    return c.json({ ok: true })
  },
)

// ─── Precios por volumen ──────────────────────────────────────────────────────

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{id}/precios-volumen",
    operationId: "catalogo_listar_precios_volumen",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Lista de precios por volumen", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const precios = await makeRepo().listarOpciones(c.req.param("id"))
    return c.json({ data: precios })
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{id}/precios-volumen",
    operationId: "catalogo_crear_precio_volumen",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: PrecioVolumenCreateSchema } } },
    },
    responses: {
      201: createdResponse("Precio por volumen creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const body = await c.req.json()
    const parsed = PrecioVolumenCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const precio = await new CrearPrecioVolumenUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data)
      return c.json(precio, 201)
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof PrecioVolumenCantidadDuplicada) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "delete",
    path: "/productos/{id}/precios-volumen/{pvId}",
    operationId: "catalogo_eliminar_precio_volumen",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: { params: z.object({ id: z.string(), pvId: z.string() }) },
    responses: {
      200: okResponse("Precio por volumen eliminado", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    await makeRepo().eliminarPrecioVolumen(c.req.param("pvId"), c.req.param("id"))
    return c.json({ ok: true })
  },
)

// ─── Opciones ─────────────────────────────────────────────────────────────────

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{id}/opciones",
    operationId: "catalogo_listar_opciones",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Lista de opciones", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const opciones = await makeRepo().listarOpciones(c.req.param("id"))
    return c.json({ data: opciones })
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{id}/opciones",
    operationId: "catalogo_crear_opcion",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: OpcionCreateSchema } } },
    },
    responses: {
      201: createdResponse("Opción creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const body = await c.req.json()
    const parsed = OpcionCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const opcion = await new CrearOpcionUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data)
      return c.json(opcion, 201)
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof OpcionNombreDuplicada) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "put",
    path: "/productos/{id}/opciones/{opId}",
    operationId: "catalogo_actualizar_opcion",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string(), opId: z.string() }),
      body: { content: { "application/json": { schema: OpcionUpdateSchema } } },
    },
    responses: {
      200: okResponse("Opción actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const body = await c.req.json()
    const parsed = OpcionUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const opcion = await new ActualizarOpcionUseCase(makeRepo()).ejecutar(c.req.param("opId"), c.req.param("id"), parsed.data)
      return c.json(opcion)
    } catch (err) {
      if (err instanceof OpcionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// ─── Ofertas ──────────────────────────────────────────────────────────────────

productoRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{id}/ofertas",
    operationId: "catalogo_listar_ofertas",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Lista de ofertas", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const { soloVigentes } = c.req.query()
    const ofertas = await makeRepo().listarOfertas(c.req.param("id"), soloVigentes === "true")
    return c.json({ data: ofertas })
  },
)

productoRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{id}/ofertas",
    operationId: "catalogo_crear_oferta",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: OfertaCreateSchema } } },
    },
    responses: {
      201: createdResponse("Oferta creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = OfertaCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const oferta = await new CrearOfertaUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(c.req.param("id"), parsed.data, tenantId)
      return c.json(oferta, 201)
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof OfertaSolapada) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

productoRouter.openapi(
  createRoute({
    method: "put",
    path: "/productos/{id}/ofertas/{ofId}",
    operationId: "catalogo_actualizar_oferta",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_CATALOGO_ESCRITURA),
    request: {
      params: z.object({ id: z.string(), ofId: z.string() }),
      body: { content: { "application/json": { schema: OfertaUpdateSchema } } },
    },
    responses: {
      200: okResponse("Oferta actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const body = await c.req.json()
    const parsed = OfertaUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const oferta = await new ActualizarOfertaUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
        c.req.param("ofId"),
        c.req.param("id"),
        parsed.data,
        c.get("tenantId"),
      )
      return c.json(oferta)
    } catch (err) {
      if (err instanceof OfertaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
