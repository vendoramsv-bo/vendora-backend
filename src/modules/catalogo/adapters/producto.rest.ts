import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ProductoPrismaRepository } from "../infrastructure/producto.prisma.repository.js"
import { CrearProductoUseCase } from "../application/producto/crear-producto.usecase.js"
import { ListarProductosUseCase } from "../application/producto/listar-productos.usecase.js"
import { ObtenerProductoUseCase } from "../application/producto/obtener-producto.usecase.js"
import { ActualizarProductoUseCase } from "../application/producto/actualizar-producto.usecase.js"
import { CambiarEstadoProductoUseCase } from "../application/producto/cambiar-estado-producto.usecase.js"
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
} from "../domain/catalogo.errors.js"
import { getCatalogoNotificador } from "../infrastructure/catalogo.notificador.provider.js"
import { paginate } from "../../../core/query-params.js"

export const productoRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new ProductoPrismaRepository(db)
}

// ─── Productos base ───────────────────────────────────────────────────────────

productoRouter.get("/productos", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsCatalogoSchema.parse(c.req.query())
  const resultado = await new ListarProductosUseCase(makeRepo()).ejecutar(tenantId, params)
  return c.json(paginate(resultado.data.map((p) => p.toJSON()), resultado.total, params))
})

productoRouter.post("/productos", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ProductoCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const producto = await new CrearProductoUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(parsed.data, tenantId, session.user.id)
    return c.json(producto.toJSON(), 201)
  } catch (err) {
    if (err instanceof ProductoCodigoDuplicado) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof ProductoNombreDuplicado) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

productoRouter.get("/productos/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const producto = await new ObtenerProductoUseCase(makeRepo()).ejecutar(c.req.param("id"), tenantId)
    return c.json(producto.toJSON())
  } catch (err) {
    if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

productoRouter.put("/productos/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
    throw err
  }
})

productoRouter.patch("/productos/:id/estado", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

productoRouter.get("/productos/:id/precio-historico", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsCatalogoSchema.parse(c.req.query())
  const resultado = await makeRepo().listarPrecioHistorico(c.req.param("id"), tenantId, params)
  return c.json(paginate(resultado.data, resultado.total, params))
})

// ─── Atributos ────────────────────────────────────────────────────────────────

productoRouter.get("/productos/:id/atributos", async (c) => {
  const tenantId = c.get("tenantId")
  const atributos = await makeRepo().listarAtributos(c.req.param("id"), tenantId)
  return c.json({ data: atributos })
})

productoRouter.post("/productos/:id/atributos", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

productoRouter.post("/productos/:id/atributos/:attrId/valores", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

productoRouter.delete("/productos/:id/atributos/:attrId/valores/:valId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  try {
    await new EliminarValorAtributoUseCase(makeRepo()).ejecutar(c.req.param("valId"), c.req.param("id"))
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof AtributoValorEnUso) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// ─── Variantes ────────────────────────────────────────────────────────────────

productoRouter.get("/productos/:id/variantes", async (c) => {
  const tenantId = c.get("tenantId")
  const variantes = await makeRepo().listarVariantes(c.req.param("id"), tenantId)
  return c.json({ data: variantes })
})

productoRouter.post("/productos/:id/variantes", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const body = await c.req.json()
  const parsed = VarianteCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const variante = await new CrearVarianteUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data, tenantId)
    return c.json(variante, 201)
  } catch (err) {
    if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof VarianteSkuDuplicado) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof VarianteAtributosDuplicados) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

productoRouter.put("/productos/:id/variantes/:varId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

productoRouter.patch("/productos/:id/variantes/:varId/estado", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CambiarEstadoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  await makeRepo().cambiarEstadoVariante(c.req.param("varId"), c.req.param("id"), parsed.data.estado, session.user.id)
  return c.json({ ok: true })
})

// ─── Precios por volumen ──────────────────────────────────────────────────────

productoRouter.get("/productos/:id/precios-volumen", async (c) => {
  const precios = await makeRepo().listarOpciones(c.req.param("id"))
  return c.json({ data: precios })
})

productoRouter.post("/productos/:id/precios-volumen", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

productoRouter.delete("/productos/:id/precios-volumen/:pvId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  await makeRepo().eliminarPrecioVolumen(c.req.param("pvId"), c.req.param("id"))
  return c.json({ ok: true })
})

// ─── Opciones ─────────────────────────────────────────────────────────────────

productoRouter.get("/productos/:id/opciones", async (c) => {
  const opciones = await makeRepo().listarOpciones(c.req.param("id"))
  return c.json({ data: opciones })
})

productoRouter.post("/productos/:id/opciones", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

productoRouter.put("/productos/:id/opciones/:opId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// ─── Ofertas ──────────────────────────────────────────────────────────────────

productoRouter.get("/productos/:id/ofertas", async (c) => {
  const { soloVigentes } = c.req.query()
  const ofertas = await makeRepo().listarOfertas(c.req.param("id"), soloVigentes === "true")
  return c.json({ data: ofertas })
})

productoRouter.post("/productos/:id/ofertas", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

productoRouter.put("/productos/:id/ofertas/:ofId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})
