import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ActividadEconomicaPrismaRepository } from "../infrastructure/actividad-economica.prisma.repository.js"
import { ListarActividadesUseCase } from "../application/actividad-economica/listar-actividades.usecase.js"
import { CrearActividadUseCase } from "../application/actividad-economica/crear-actividad.usecase.js"
import { DesactivarActividadUseCase } from "../application/actividad-economica/desactivar-actividad.usecase.js"
import { ActividadCreateSchema } from "./catalogo.schema.js"
import { ActividadDuplicada, ActividadNoEncontrada, ActividadEnUso } from "../domain/catalogo.errors.js"
import { getCatalogoNotificador } from "../infrastructure/catalogo.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const actividadEconomicaRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new ActividadEconomicaPrismaRepository(db)
}

// ─── Alias /actividades-economicas → /cla-actividades (para compatibilidad wizard) ───

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/actividades-economicas",
    operationId: "catalogo_listar_actividades_economicas_alias",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de clasificadores de actividades (alias wizard)", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const repo = makeRepo()
    const clasificadores = await repo.listarClasificadores()
    return c.json({ data: clasificadores })
  },
)

// ─── Catálogos globales fijos para el wizard ──────────────────────────────────

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/turnos",
    operationId: "catalogo_listar_turnos_globales",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de turnos del clasificador global", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const turnos = await db.claTurnosDeAtencion.findMany({
      select: { id: true, turno: true, descripcion: true },
      orderBy: { createdAt: "asc" },
    })
    return c.json({ data: turnos.map((t: any) => ({ id: t.id, nombre: t.turno, descripcion: t.descripcion })) })
  },
)

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/proveedores",
    operationId: "catalogo_listar_proveedores_globales",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de proveedores del clasificador global", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const proveedores = await db.claProveedor.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    })
    return c.json({ data: proveedores })
  },
)

const SERVICIOS_MEDICOS_GLOBALES = [
  { id: "CONSULTA_GENERAL", nombre: "Consulta General" },
  { id: "CONSULTA_ESPECIALIZADA", nombre: "Consulta Especializada" },
  { id: "ODONTOLOGIA", nombre: "Odontología General" },
  { id: "ENDODONCIA", nombre: "Endodoncia" },
  { id: "ORTODONCIA", nombre: "Ortodoncia" },
  { id: "RADIOGRAFIA", nombre: "Radiografía" },
  { id: "LABORATORIO", nombre: "Laboratorio Clínico" },
  { id: "ECOGRAFIA", nombre: "Ecografía" },
  { id: "FISIOTERAPIA", nombre: "Fisioterapia" },
  { id: "PSICOLOGIA", nombre: "Psicología" },
  { id: "NUTRICION", nombre: "Nutrición" },
  { id: "PEDIATRIA", nombre: "Pediatría" },
  { id: "GINECOLOGIA", nombre: "Ginecología" },
  { id: "DERMATOLOGIA", nombre: "Dermatología" },
  { id: "CARDIOLOGIA", nombre: "Cardiología" },
]

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/servicios",
    operationId: "catalogo_listar_servicios_globales",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de servicios médicos globales", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => c.json({ data: SERVICIOS_MEDICOS_GLOBALES }),
)

const SEGUROS_GLOBALES = [
  { id: "CNS", nombre: "Caja Nacional de Salud (CNS)" },
  { id: "COSSMIL", nombre: "COSSMIL" },
  { id: "CAJA_CORDES", nombre: "Caja de Salud CORDES" },
  { id: "CAJA_CAMARA", nombre: "Caja de Salud de la Cámara de Comercio" },
  { id: "CAJA_BANCARIA", nombre: "Caja Bancaria Estatal de Salud" },
  { id: "BUPA", nombre: "BUPA Bolivia" },
  { id: "ALIANZA", nombre: "Alianza Vida Seguros" },
  { id: "BOLIVAR", nombre: "Seguros Bolívar" },
  { id: "LA_BOLIVIANA", nombre: "La Boliviana Ciacruz" },
  { id: "CRECER", nombre: "Seguros Crecer" },
]

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/seguros",
    operationId: "catalogo_listar_seguros_globales",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de seguros médicos globales", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => c.json({ data: SEGUROS_GLOBALES }),
)

const ESPECIALIDADES_GLOBALES = [
  { id: "MEDICINA_GENERAL", nombre: "Medicina General" },
  { id: "PEDIATRIA", nombre: "Pediatría" },
  { id: "GINECOLOGIA", nombre: "Ginecología y Obstetricia" },
  { id: "CARDIOLOGIA", nombre: "Cardiología" },
  { id: "DERMATOLOGIA", nombre: "Dermatología" },
  { id: "OFTALMOLOGIA", nombre: "Oftalmología" },
  { id: "ORTOPEDIA", nombre: "Ortopedia y Traumatología" },
  { id: "NEUROLOGIA", nombre: "Neurología" },
  { id: "PSIQUIATRIA", nombre: "Psiquiatría" },
  { id: "PSICOLOGIA", nombre: "Psicología" },
  { id: "NUTRICION", nombre: "Nutrición y Dietética" },
  { id: "FISIOTERAPIA", nombre: "Fisioterapia y Rehabilitación" },
  { id: "ODONTOLOGIA", nombre: "Odontología General" },
  { id: "ENDODONCIA", nombre: "Endodoncia" },
  { id: "ORTODONCIA", nombre: "Ortodoncia" },
  { id: "CIRUGIA", nombre: "Cirugía General" },
  { id: "UROLOGIA", nombre: "Urología" },
  { id: "GASTROENTEROLOGIA", nombre: "Gastroenterología" },
]

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/especialidades",
    operationId: "catalogo_listar_especialidades_globales",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de especialidades médicas globales", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => c.json({ data: ESPECIALIDADES_GLOBALES }),
)

const TIPOS_COCINA_GLOBALES = [
  { id: "CRIOLLA_BOLIVIANA", nombre: "Criolla Boliviana" },
  { id: "ITALIANA", nombre: "Italiana" },
  { id: "CHINA", nombre: "China" },
  { id: "JAPONESA", nombre: "Japonesa" },
  { id: "MEXICANA", nombre: "Mexicana" },
  { id: "PARRILLA", nombre: "Parrilla / Asados" },
  { id: "FAST_FOOD", nombre: "Comida Rápida" },
  { id: "MARISCOS", nombre: "Mariscos" },
  { id: "VEGETARIANA", nombre: "Vegetariana / Vegana" },
  { id: "POSTRES", nombre: "Postres y Repostería" },
  { id: "PIZZERIA", nombre: "Pizzería" },
  { id: "POLLOS", nombre: "Pollos y Broasters" },
]

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/categorias-cocina",
    operationId: "catalogo_listar_tipos_cocina",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de tipos de cocina para restaurante", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => c.json({ data: TIPOS_COCINA_GLOBALES }),
)

// ─── GET /api/catalogo/cla-productos?claActividadId=X ────────────────────────

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/cla-productos",
    operationId: "catalogo_listar_cla_productos",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { query: z.object({ claActividadId: z.string().optional() }) },
    responses: {
      200: okResponse("Productos del clasificador global", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const { claActividadId } = c.req.query()
    const productos = await db.claProducto.findMany({
      where: claActividadId ? { claActividadId } : undefined,
      select: { id: true, nombre: true, codigo: true, precio: true },
      orderBy: { nombre: "asc" },
    })
    return c.json({ data: productos })
  },
)

// ─── /cla-actividades (original) ─────────────────────────────────────────────

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/cla-actividades",
    operationId: "catalogo_listar_cla_actividades",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de clasificadores de actividades", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const repo = makeRepo()
    const clasificadores = await repo.listarClasificadores()
    return c.json({ data: clasificadores })
  },
)

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/actividades",
    operationId: "catalogo_listar_actividades",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de actividades económicas", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const resultado = await new ListarActividadesUseCase(makeRepo()).ejecutar(tenantId)
    return c.json({ data: resultado.actividades.map((a) => a.toJSON()) })
  },
)

actividadEconomicaRouter.openapi(
  createRoute({
    method: "post",
    path: "/actividades",
    operationId: "catalogo_crear_actividad",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      body: { content: { "application/json": { schema: ActividadCreateSchema } } },
    },
    responses: {
      201: createdResponse("Actividad creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActividadCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const actividad = await new CrearActividadUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
        parsed.data.claActividadId,
        tenantId,
        session.user.id,
      )
      return c.json(actividad.toJSON(), 201)
    } catch (err) {
      if (err instanceof ActividadDuplicada) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

actividadEconomicaRouter.openapi(
  createRoute({
    method: "delete",
    path: "/actividades/{id}",
    operationId: "catalogo_eliminar_actividad",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Actividad desactivada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    try {
      await new DesactivarActividadUseCase(makeRepo()).ejecutar(c.req.param("id"), tenantId, session.user.id)
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof ActividadNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ActividadEnUso) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)
