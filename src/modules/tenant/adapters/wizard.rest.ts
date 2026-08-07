import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireAuth, requireTenantActivo, requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"
import { SincronizarProductosUseCase } from "../../catalogo/application/producto/sincronizar-productos-usecase.js"
import { ProductoPrismaRepository } from "../../catalogo/infrastructure/producto.prisma.repository.js"
import { getCatalogoNotificador } from "../../catalogo/infrastructure/catalogo.notificador.provider.js"
import { ClaProductoNoEncontrado } from "../../catalogo/domain/catalogo.errors.js"
import {
  aIdTema,
  aEnumTema,
  aIdLineado,
  aEnumLineado,
  aIdDespliegue,
  aEnumDespliegue,
} from "./preferencia-presentacion.schema.js"

export const wizardRouter = new OpenAPIHono<HonoEnv>()

wizardRouter.use("*", requireAuth, requireTenantActivo)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function pasoToInt(paso: string): number {
  if (paso === "FINALIZADO") return 11
  const m = paso.match(/^PASO_(\d+)$/)
  return m ? parseInt(m[1], 10) : 1
}

function intToPaso(n: number): string {
  if (n >= 11) return "FINALIZADO"
  if (n <= 0) return "PASO_1"
  return `PASO_${n}`
}

// ─── GET /api/tenant/config ───────────────────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "get",
    path: "/config",
    operationId: "wizard_obtener_config",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Configuración del tenant para wizard", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        nombreLargo: true,
        descripcion: true,
        esTienda: true,
        esConsultorio: true,
        esRestaurante: true,
        plan: true,
        estado: true,
        ultimoPasoCreacion: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!tenant) return c.json({ error: "TENANT_NO_ENCONTRADO" }, 404)

    const [propietario, tienda, presentacion, consultorio, restaurante] = await Promise.all([
      db.propietario.findUnique({
        where: { tenantId },
        select: { id: true, nombres: true, telefono: true, domicilio: true, nombreReferencia: true, telefonoReferencia: true, imagenUrl: true },
      }),
      db.tienda.findUnique({
        where: { tenantId },
        select: {
          id: true,
          configuracion: {
            select: {
              tipoDeTienda: true,
              cantidadPuntosDeVenta: true,
              cantidadVendedores: true,
            },
          },
        },
      }),
      db.preferenciaPresentacion.findUnique({
        where: { tenantId },
        select: { tema: true, tipoDespliegueVentas: true, tipoLineado: true },
      }),
      db.consultorio.findUnique({
        where: { tenantId },
        select: { especialidades: true, contactoPublico: true },
      }),
      db.restaurante.findUnique({
        where: { tenantId },
        select: { contactoPublico: true },
      }),
    ])

    const consultorioContacto = (consultorio?.contactoPublico as Record<string, unknown> | null) ?? {}
    const restauranteContacto = (restaurante?.contactoPublico as Record<string, unknown> | null) ?? {}

    return c.json({
      ...tenant,
      ultimoPasoCreacion: intToPaso(tenant.ultimoPasoCreacion),
      propietario: propietario ?? null,
      // El paso 7 sigue viendo un solo objeto `configuracion`: lo operativo de
      // tienda y la presentación, que ahora viven en tablas distintas. Los ids
      // de presentación bajan en minúscula, que es lo que el cliente entiende.
      configuracion: {
        ...(tienda?.configuracion ?? {}),
        tema: presentacion ? aIdTema(presentacion.tema) : undefined,
        tipoLineado: presentacion ? aIdLineado(presentacion.tipoLineado) : undefined,
        tipoDespliegueVentas: presentacion ? aIdDespliegue(presentacion.tipoDespliegueVentas) : undefined,
      },
      consultorio: consultorio
        ? { seguros: consultorioContacto.seguros ?? [], especialidades: consultorio.especialidades ?? [] }
        : null,
      restaurante: restaurante
        ? { tiposCocina: restauranteContacto.tiposCocina ?? [], zonas: restauranteContacto.zonas ?? [] }
        : null,
    })
  },
)

// ─── PATCH /api/tenant/config ─────────────────────────────────────────────────

const PropietarioUpdateSchema = z.object({
  nombres: z.string().optional(),
  telefono: z.string().optional(),
  domicilio: z.string().optional(),
  nombreReferencia: z.string().optional(),
  telefonoReferencia: z.string().optional(),
  imagenUrl: z.string().nullable().optional(),
}).optional()

const ConfigPatchSchema = z.object({
  ultimoPasoCreacion: z.string().optional(),
  nombreLargo: z.string().optional(),
  descripcion: z.string().optional(),
  propietario: PropietarioUpdateSchema,
  medico: z.record(z.unknown()).optional(),
  configuracion: z.record(z.unknown()).optional(),
  horarios: z.array(z.unknown()).optional(),
  tipoServicio: z.string().optional(),
  aceptaReservas: z.boolean().optional(),
  cobraPropina: z.boolean().optional(),
  porcentajePropina: z.number().optional(),
}).partial()

wizardRouter.openapi(
  createRoute({
    method: "patch",
    path: "/config",
    operationId: "wizard_actualizar_config",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: ConfigPatchSchema } } },
    },
    responses: {
      200: okResponse("Config actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = ConfigPatchSchema.parse(await c.req.json())

    const tenantUpdate: Record<string, unknown> = { updatedById: session.user.id }
    if (body.ultimoPasoCreacion !== undefined) {
      tenantUpdate.ultimoPasoCreacion = pasoToInt(body.ultimoPasoCreacion)
      // El wizard llega a su fin: además del contador de progreso, el propio
      // tenant pasa a estado FINALIZADO (arrancaba en PENDIENTE al crearse).
      if (body.ultimoPasoCreacion === "FINALIZADO") {
        tenantUpdate.estado = "FINALIZADO"
      }
    }
    if (body.nombreLargo !== undefined) tenantUpdate.nombreLargo = body.nombreLargo
    if (body.descripcion !== undefined) tenantUpdate.descripcion = body.descripcion

    if (Object.keys(tenantUpdate).length > 1) {
      await db.tenant.update({ where: { id: tenantId }, data: tenantUpdate })
    }

    // Propietario upsert
    if (body.propietario) {
      const p = body.propietario as Record<string, unknown>
      const existing = await db.propietario.findUnique({ where: { tenantId } })
      if (existing) {
        await db.propietario.update({
          where: { tenantId },
          data: { ...p, updatedById: session.user.id },
        })
      } else {
        await db.propietario.create({
          data: {
            tenantId,
            userId: session.user.id,
            nombres: (p.nombres as string) ?? "",
            telefono: (p.telefono as string) ?? "",
            domicilio: (p.domicilio as string) ?? "",
            nombreReferencia: (p.nombreReferencia as string) ?? "",
            telefonoReferencia: (p.telefonoReferencia as string) ?? "",
            imagenUrl: (p.imagenUrl as string | null) ?? null,
            createdById: session.user.id,
          },
        })
      }
    }

    // Consultorio updates
    if (body.horarios !== undefined || body.configuracion || body.tipoServicio !== undefined) {
      const consultorioExisting = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true, contactoPublico: true } })
      if (consultorioExisting) {
        const consultorioData: Record<string, unknown> = { updatedById: session.user.id }
        if (body.horarios !== undefined) consultorioData.horarios = body.horarios
        if (body.tipoServicio !== undefined) consultorioData.tipoServicio = body.tipoServicio
        if (body.configuracion) {
          const cfg = body.configuracion as Record<string, unknown>
          // cantidadMedicos y cantidadRecepcionistas no son campos del modelo — van a contactoPublico
          const contacto = (consultorioExisting.contactoPublico as Record<string, unknown>) ?? {}
          const contactoUpdate: Record<string, unknown> = { ...contacto }
          if (cfg.cantidadMedicos !== undefined) contactoUpdate.cantidadMedicos = cfg.cantidadMedicos
          if (cfg.cantidadRecepcionistas !== undefined) contactoUpdate.cantidadRecepcionistas = cfg.cantidadRecepcionistas
          if (cfg.tipoConsultorio !== undefined) contactoUpdate.tipoConsultorio = cfg.tipoConsultorio
          consultorioData.contactoPublico = contactoUpdate
        }
        await db.consultorio.update({ where: { tenantId }, data: consultorioData })
      }
    }

    // Restaurante updates
    if (body.tipoServicio !== undefined || body.aceptaReservas !== undefined || body.cobraPropina !== undefined || body.porcentajePropina !== undefined) {
      const restauranteExisting = await db.restaurante.findUnique({ where: { tenantId }, select: { id: true, contactoPublico: true } })
      if (restauranteExisting) {
        const restauranteData: Record<string, unknown> = { updatedById: session.user.id }
        if (body.tipoServicio !== undefined) restauranteData.tipoServicio = body.tipoServicio
        // aceptaReservas, cobraPropina y porcentajePropina no son campos directos del modelo → van a contactoPublico
        if (body.aceptaReservas !== undefined || body.cobraPropina !== undefined || body.porcentajePropina !== undefined) {
          const contacto = (restauranteExisting.contactoPublico as Record<string, unknown>) ?? {}
          if (body.aceptaReservas !== undefined) contacto.aceptaReservas = body.aceptaReservas
          if (body.cobraPropina !== undefined) contacto.cobraPropina = body.cobraPropina
          if (body.porcentajePropina !== undefined) contacto.porcentajePropina = body.porcentajePropina
          restauranteData.contactoPublico = contacto
        }
        await db.restaurante.update({ where: { tenantId }, data: restauranteData })
      }
    }

    // Tienda configuracion updates
    if (body.configuracion && !body.horarios && !body.tipoServicio) {
      const tienda = await db.tienda.findUnique({ where: { tenantId }, select: { id: true } })
      if (tienda) {
        const cfg = body.configuracion as Record<string, unknown>
        const cantidadPuntosDeVenta = cfg.cantidadPuntosDeVenta as number | undefined

        await db.$transaction(async (tx: any) => {
          // Configuracion se quedó SOLO con lo operativo de tienda.
          await tx.configuracion.upsert({
            where: { tiendaId: tienda.id },
            create: {
              tiendaId: tienda.id,
              tipoDeTienda: (cfg.tipoDeTienda as string) ?? "PEQUENA",
              cantidadPuntosDeVenta: cantidadPuntosDeVenta ?? 1,
              cantidadVendedores: (cfg.cantidadVendedores as number) ?? 1,
            },
            update: {
              ...(cfg.tipoDeTienda !== undefined ? { tipoDeTienda: cfg.tipoDeTienda as string } : {}),
              ...(cantidadPuntosDeVenta !== undefined ? { cantidadPuntosDeVenta } : {}),
              ...(cfg.cantidadVendedores !== undefined ? { cantidadVendedores: cfg.cantidadVendedores as number } : {}),
            },
          })

          // La presentación va a PreferenciaPresentacion, que cuelga del Tenant:
          // el paso 7 del asistente sigue pidiendo lo mismo, pero ahora lo guarda
          // donde un consultorio o un restaurante también pueden tenerlo (FR-034).
          if (
            cfg.tema !== undefined ||
            cfg.tipoLineado !== undefined ||
            cfg.tipoDespliegueVentas !== undefined
          ) {
            const presentacion = {
              ...(cfg.tema !== undefined
                ? { tema: aEnumTema(aIdTema(cfg.tema as string)) }
                : {}),
              ...(cfg.tipoLineado !== undefined
                ? { tipoLineado: aEnumLineado(aIdLineado(cfg.tipoLineado as string)) }
                : {}),
              ...(cfg.tipoDespliegueVentas !== undefined
                ? { tipoDespliegueVentas: aEnumDespliegue(aIdDespliegue(cfg.tipoDespliegueVentas as string)) }
                : {}),
            }
            await tx.preferenciaPresentacion.upsert({
              where: { tenantId },
              create: { tenantId, ...presentacion },
              update: presentacion,
            })
          }

          // Al definir la cantidad de puntos de venta se completan o quitan los que corresponda hasta llegar a esa cantidad
          if (cantidadPuntosDeVenta !== undefined) {
            const existentes = await tx.puntosDeVenta.count({ where: { tenantId } })
            if (cantidadPuntosDeVenta > existentes) {
              // No asumir que los nombres "Punto de Venta 1..N" están libres:
              // si el usuario renombró alguno en el Paso 8, o si una baja
              // previa dejó huecos en la numeración, un índice puramente
              // secuencial puede chocar con `@@unique([tenantId, nombre])`.
              // Se buscan los primeros índices realmente libres.
              const nombresExistentes = new Set<string>(
                (await tx.puntosDeVenta.findMany({ where: { tenantId }, select: { nombre: true } })).map(
                  (p: { nombre: string }) => p.nombre,
                ),
              )
              const nuevos: Array<{ tenantId: string; nombre: string; createdById: string }> = []
              let indice = 1
              for (let i = 0; i < cantidadPuntosDeVenta - existentes; i++) {
                while (nombresExistentes.has(`Punto de Venta ${indice}`)) indice++
                const nombre = `Punto de Venta ${indice}`
                nombresExistentes.add(nombre)
                nuevos.push({ tenantId, nombre, createdById: session.user.id })
                indice++
              }
              await tx.puntosDeVenta.createMany({ data: nuevos })
            } else if (cantidadPuntosDeVenta < existentes) {
              // Solo se eliminan los últimos puntos de venta sin ventas ni aperturas de caja registradas,
              // para no perder historial si el punto de venta ya fue usado
              const eliminables = await tx.puntosDeVenta.findMany({
                where: { tenantId, ventas: { none: {} }, aperturasCierresDeCaja: { none: {} } },
                orderBy: { createdAt: "desc" },
                take: existentes - cantidadPuntosDeVenta,
                select: { id: true },
              })
              if (eliminables.length > 0) {
                await tx.puntosDeVenta.deleteMany({ where: { id: { in: eliminables.map((p: any) => p.id) } } })
              }
            }
          }
        })
      }
    }

    return c.json({ ok: true })
  },
)

// ─── GET /api/tenant/actividades-economicas ──────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "get",
    path: "/actividades-economicas",
    operationId: "wizard_listar_actividades_tenant",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse(
        "Actividades económicas del tenant",
        z.object({ data: z.array(z.object({ id: z.string(), nombre: z.string() })) }),
      ),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const actividades = await db.actividadEconomica.findMany({
      where: { tenantId },
      select: { claActividadId: true, claActividadEconomica: { select: { nombre: true } } },
    })
    return c.json({
      data: actividades.map((a: any) => ({ id: a.claActividadId, nombre: a.claActividadEconomica?.nombre ?? "" })),
    })
  },
)

// ─── POST /api/tenant/actividades-economicas/bulk ────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/actividades-economicas/bulk",
    operationId: "wizard_bulk_actividades",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ ids: z.array(z.string()) }) } } },
    },
    responses: {
      201: createdResponse("Actividades sincronizadas", z.object({ creadas: z.number() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const { ids } = await c.req.json()
    const uniqueIds: string[] = [...new Set<string>(ids)]

    // Sincronizar: agregar las nuevas, eliminar las que se de-seleccionaron
    const existentes = await db.actividadEconomica.findMany({
      where: { tenantId },
      select: { claActividadId: true },
    })
    const existentesIds: string[] = existentes.map((e: any) => e.claActividadId)
    const paraAgregar = uniqueIds.filter((id) => !existentesIds.includes(id))
    const paraEliminar = existentesIds.filter((id) => !uniqueIds.includes(id))

    await db.$transaction(async (tx: any) => {
      if (paraEliminar.length > 0) {
        // No eliminar actividades cuyos productos ya registran ventas reales
        const protegidas = await tx.actividadEconomica.findMany({
          where: { tenantId, claActividadId: { in: paraEliminar }, producto: { some: { ventasDetalle: { some: {} } } } },
          select: { claActividadId: true },
        })
        const protegidasIds = new Set(protegidas.map((p: any) => p.claActividadId))
        const eliminables = paraEliminar.filter((id) => !protegidasIds.has(id))
        if (eliminables.length > 0) {
          await tx.actividadEconomica.deleteMany({ where: { tenantId, claActividadId: { in: eliminables } } })
        }
      }
      if (paraAgregar.length > 0) {
        await tx.actividadEconomica.createMany({
          data: paraAgregar.map((claActividadId) => ({ tenantId, claActividadId, createdById: session.user.id })),
        })
      }
    })
    return c.json({ creadas: uniqueIds.length }, 201)
  },
)

// ─── GET /api/tenant/catalogo/productos-seleccionados ────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "get",
    path: "/catalogo/productos-seleccionados",
    operationId: "wizard_listar_productos_seleccionados",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse(
        "Productos ya guardados en el tenant, con sus claProductoId y claActividadId",
        z.object({ data: z.array(z.object({ claActividadId: z.string(), claProductoId: z.string(), nombre: z.string() })) }),
      ),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")

    const productos = await db.producto.findMany({
      where: { tenantId },
      select: { codigo: true, nombre: true, actividadId: true, claActividadId: true, claProductoId: true },
    })

    if (productos.length === 0) return c.json({ data: [] })

    // Camino directo (fix de clasificadores comunes): altaMasiva ya guarda
    // claActividadId/claProductoId en el Producto, no hace falta reconstruirlos.
    const directos = productos
      .filter((p: any) => p.claProductoId !== null && p.claActividadId !== null)
      .map((p: any) => ({ claActividadId: p.claActividadId as string, claProductoId: p.claProductoId as string, nombre: p.nombre }))

    // Camino legado: Producto creado antes del fix (claProductoId null) — se
    // reconstruye por (claActividadId, codigo), igual que antes del fix.
    const legado = productos.filter((p: any) => p.claProductoId === null)
    let resultLegado: { claActividadId: string; claProductoId: string; nombre: string }[] = []

    if (legado.length > 0) {
      const actividadIds: string[] = [...new Set<string>(legado.map((p: any) => p.actividadId))]
      const actividades = await db.actividadEconomica.findMany({
        where: { id: { in: actividadIds } },
        select: { id: true, claActividadId: true },
      })
      const actividadMap = new Map<string, string>(actividades.map((a: any) => [a.id, a.claActividadId]))

      const conCla = legado
        .map((p: any) => ({ codigo: p.codigo, nombre: p.nombre, claActividadId: actividadMap.get(p.actividadId) ?? null }))
        .filter((p: any) => p.claActividadId !== null)

      if (conCla.length > 0) {
        const claProductos = await db.claProducto.findMany({
          where: { OR: conCla.map((p: any) => ({ codigo: p.codigo, claActividadId: p.claActividadId })) },
          select: { id: true, codigo: true, claActividadId: true },
        })

        resultLegado = conCla
          .map((p: any) => {
            const cla = claProductos.find((c: any) => c.codigo === p.codigo && c.claActividadId === p.claActividadId)
            return cla ? { claActividadId: p.claActividadId, claProductoId: cla.id, nombre: p.nombre } : null
          })
          .filter(Boolean) as { claActividadId: string; claProductoId: string; nombre: string }[]
      }
    }

    return c.json({ data: [...directos, ...resultLegado] })
  },
)

// ─── POST /api/tenant/catalogo/productos/bulk ─────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/catalogo/productos/bulk",
    operationId: "wizard_bulk_productos",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ ids: z.array(z.string()) }) } } },
    },
    responses: {
      201: createdResponse("Selección de productos sincronizada", z.object({ total: z.number() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const { ids } = await c.req.json()
    try {
      const repo = new ProductoPrismaRepository(db)
      const resultado = await new SincronizarProductosUseCase(repo, getCatalogoNotificador()).ejecutar(
        ids,
        tenantId,
        session.user.id,
      )
      return c.json({ total: resultado.creados.length }, 201)
    } catch (err) {
      if (err instanceof ClaProductoNoEncontrado) return c.json({ error: err.code, message: err.message, ids: err.ids }, 404)
      throw err
    }
  },
)

// ─── POST /api/tenant/catalogo/servicios/bulk ─────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/catalogo/servicios/bulk",
    operationId: "wizard_bulk_servicios",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ ids: z.array(z.string()) }) } } },
    },
    responses: {
      201: createdResponse("Servicios médicos creados", z.object({ creados: z.number() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const { ids } = await c.req.json()
    const uniqueNombres: string[] = [...new Set<string>(ids)]
    const consultorio = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorio) return c.json({ creados: 0 }, 201)

    // Sincronizar: agregar los nuevos, eliminar los que se de-seleccionaron
    const existentes = await db.servicioMedico.findMany({
      where: { consultorioId: consultorio.id },
      select: { nombre: true },
    })
    const existentesNombres: string[] = existentes.map((s: any) => s.nombre)
    const paraAgregar = uniqueNombres.filter((n) => !existentesNombres.includes(n))
    const paraEliminar = existentesNombres.filter((n) => !uniqueNombres.includes(n))

    let creados = 0
    await db.$transaction(async (tx: any) => {
      if (paraEliminar.length > 0) {
        // No eliminar servicios que ya tienen citas o atenciones registradas
        const protegidos = await tx.servicioMedico.findMany({
          where: {
            consultorioId: consultorio.id,
            nombre: { in: paraEliminar },
            OR: [{ citas: { some: {} } }, { atencionesDetalle: { some: {} } }],
          },
          select: { nombre: true },
        })
        const protegidosNombres = new Set(protegidos.map((p: any) => p.nombre))
        const eliminables = paraEliminar.filter((n) => !protegidosNombres.has(n))
        if (eliminables.length > 0) {
          await tx.servicioMedico.deleteMany({ where: { consultorioId: consultorio.id, nombre: { in: eliminables } } })
        }
      }
      if (paraAgregar.length > 0) {
        const result = await tx.servicioMedico.createMany({
          data: paraAgregar.map((nombre: string) => ({ consultorioId: consultorio.id, nombre, createdById: session.user.id })),
          skipDuplicates: true,
        })
        creados = result.count
      }
    })
    return c.json({ creados }, 201)
  },
)

// ─── GET /api/tenant/catalogo/servicios-seleccionados ────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "get",
    path: "/catalogo/servicios-seleccionados",
    operationId: "wizard_listar_servicios_seleccionados",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Servicios médicos ya guardados en el tenant", z.object({ data: z.array(z.object({ nombre: z.string() })) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const consultorio = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorio) return c.json({ data: [] })
    const servicios = await db.servicioMedico.findMany({
      where: { consultorioId: consultorio.id },
      select: { nombre: true },
      orderBy: { createdAt: "asc" },
    })
    return c.json({ data: servicios.map((s: any) => ({ nombre: s.nombre })) })
  },
)

// ─── GET /api/tenant/proveedores ─────────────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "get",
    path: "/proveedores",
    operationId: "wizard_listar_proveedores_tenant",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Proveedores guardados del tenant", z.object({ data: z.array(z.object({ nombre: z.string() })) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const proveedores = await db.proveedor.findMany({
      where: { tenantId, claProveedorId: { not: null } },
      select: { claProveedorId: true, nombre: true },
    })
    return c.json({ data: proveedores.map((p: any) => ({ claProveedorId: p.claProveedorId, nombre: p.nombre })) })
  },
)

// ─── POST /api/tenant/proveedores/bulk ────────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/proveedores/bulk",
    operationId: "wizard_bulk_proveedores",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ ids: z.array(z.string()) }) } } },
    },
    responses: {
      201: createdResponse("Proveedores creados", z.object({ creados: z.number() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const { ids } = await c.req.json()
    const uniqueIds: string[] = [...new Set<string>(ids)]

    // Obtener nombre real desde ClaProveedor
    const claProveedores = await db.claProveedor.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, nombre: true, direccion: true, telefono: true },
    })
    const claMap = new Map<string, any>(claProveedores.map((p: any) => [p.id, p]))

    // Diff: proveedores del tenant que vinieron del clasificador
    const existentes = await db.proveedor.findMany({
      where: { tenantId, claProveedorId: { not: null } },
      select: { claProveedorId: true },
    })
    const existentesIds: string[] = existentes.map((p: any) => p.claProveedorId)
    const paraAgregar = uniqueIds.filter((id) => !existentesIds.includes(id))
    const paraEliminar = existentesIds.filter((id) => !uniqueIds.includes(id))

    await db.$transaction(async (tx: any) => {
      if (paraEliminar.length > 0) {
        // No eliminar proveedores que ya tienen compras o ingresos de almacén registrados
        const protegidos = await tx.proveedor.findMany({
          where: {
            tenantId,
            claProveedorId: { in: paraEliminar },
            OR: [{ compras: { some: {} } }, { ingresosAlmacen: { some: {} } }],
          },
          select: { claProveedorId: true },
        })
        const protegidosIds = new Set(protegidos.map((p: any) => p.claProveedorId))
        const eliminables = paraEliminar.filter((id) => !protegidosIds.has(id))
        if (eliminables.length > 0) {
          await tx.proveedor.deleteMany({ where: { tenantId, claProveedorId: { in: eliminables } } })
        }
      }
      if (paraAgregar.length > 0) {
        await tx.proveedor.createMany({
          data: paraAgregar.map((claProveedorId) => {
            const cla = claMap.get(claProveedorId)
            return {
              tenantId,
              claProveedorId,
              nombre: cla?.nombre ?? claProveedorId,
              direccion: cla?.direccion ?? undefined,
              telefono: cla?.telefono ?? undefined,
              createdById: session.user.id,
            }
          }),
        })
      }
    })
    return c.json({ creados: uniqueIds.length }, 201)
  },
)

// ─── GET /api/tenant/turnos ───────────────────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "get",
    path: "/turnos",
    operationId: "wizard_listar_turnos_tenant",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Turnos del tenant", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const turnos = await db.turnosDeAtencion.findMany({
      where: { tenantId, claTurnoId: { not: null } },
      select: { claTurnoId: true, turno: true },
    })
    return c.json({ data: turnos.map((t: any) => ({ claTurnoId: t.claTurnoId, nombre: t.turno })) })
  },
)

// ─── POST /api/tenant/turnos/bulk ─────────────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/turnos/bulk",
    operationId: "wizard_bulk_turnos",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ ids: z.array(z.string()) }) } } },
    },
    responses: {
      201: createdResponse("Turnos de atención sincronizados", z.object({ creados: z.number() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const { ids } = await c.req.json()
    const uniqueIds: string[] = [...new Set<string>(ids)]

    // Obtener nombre real desde ClaTurnosDeAtencion
    const claTurnos = await db.claTurnosDeAtencion.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, turno: true },
    })
    const claMap = new Map<string, string>(claTurnos.map((t: any) => [t.id, t.turno]))

    // Diff contra los turnos del tenant que vinieron del clasificador
    const existentes = await db.turnosDeAtencion.findMany({
      where: { tenantId, claTurnoId: { not: null } },
      select: { claTurnoId: true },
    })
    const existentesIds: string[] = existentes.map((t: any) => t.claTurnoId)
    const paraAgregar = uniqueIds.filter((id) => !existentesIds.includes(id))
    const paraEliminar = existentesIds.filter((id) => !uniqueIds.includes(id))

    await db.$transaction(async (tx: any) => {
      if (paraEliminar.length > 0) {
        // No eliminar turnos que ya tienen ventas o aperturas de caja registradas
        // (mismo criterio ya usado para PuntosDeVenta)
        const protegidos = await tx.turnosDeAtencion.findMany({
          where: {
            tenantId,
            claTurnoId: { in: paraEliminar },
            OR: [{ ventas: { some: {} } }, { aperturasCierresDeCaja: { some: {} } }],
          },
          select: { claTurnoId: true },
        })
        const protegidosIds = new Set(protegidos.map((t: any) => t.claTurnoId))
        const eliminables = paraEliminar.filter((id) => !protegidosIds.has(id))
        if (eliminables.length > 0) {
          await tx.turnosDeAtencion.deleteMany({ where: { tenantId, claTurnoId: { in: eliminables } } })
        }
      }
      if (paraAgregar.length > 0) {
        await tx.turnosDeAtencion.createMany({
          data: paraAgregar.map((claTurnoId) => ({
            tenantId,
            claTurnoId,
            turno: claMap.get(claTurnoId) ?? claTurnoId,
            createdById: session.user.id,
          })),
        })
      }
    })
    return c.json({ creados: uniqueIds.length }, 201)
  },
)

// ─── POST /api/tenant/seguros/bulk ────────────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/seguros/bulk",
    operationId: "wizard_bulk_seguros",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ ids: z.array(z.string()) }) } } },
    },
    responses: {
      201: createdResponse("Seguros guardados", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const { ids } = await c.req.json()
    const consultorio = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true, contactoPublico: true } })
    if (consultorio) {
      const contacto = (consultorio.contactoPublico as Record<string, unknown>) ?? {}
      await db.consultorio.update({
        where: { tenantId },
        data: { contactoPublico: { ...contacto, seguros: ids } },
      })
    }
    return c.json({ ok: true }, 201)
  },
)

// ─── POST /api/tenant/especialidades/bulk ────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/especialidades/bulk",
    operationId: "wizard_bulk_especialidades",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ ids: z.array(z.string()) }) } } },
    },
    responses: {
      201: createdResponse("Especialidades guardadas", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const { ids } = await c.req.json()
    const consultorio = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (consultorio) {
      await db.consultorio.update({ where: { tenantId }, data: { especialidades: ids } })
    }
    return c.json({ ok: true }, 201)
  },
)

// ─── POST /api/tenant/categorias/bulk ────────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/categorias/bulk",
    operationId: "wizard_bulk_categorias",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ ids: z.array(z.string()) }) } } },
    },
    responses: {
      201: createdResponse("Tipos de cocina guardados", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const { ids } = await c.req.json()
    const restaurante = await db.restaurante.findUnique({ where: { tenantId }, select: { id: true, contactoPublico: true } })
    if (restaurante) {
      const contacto = (restaurante.contactoPublico as Record<string, unknown>) ?? {}
      await db.restaurante.update({
        where: { tenantId },
        data: { contactoPublico: { ...contacto, tiposCocina: ids } },
      })
    }
    return c.json({ ok: true }, 201)
  },
)

// ─── POST /api/tenant/zonas/bulk ──────────────────────────────────────────────

const ZonaMesaSchema = z.object({
  nombre: z.string(),
  mesas: z.array(z.object({ numero: z.number() })),
})

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/zonas/bulk",
    operationId: "wizard_bulk_zonas",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: z.object({ zonas: z.array(ZonaMesaSchema) }) } } },
    },
    responses: {
      201: createdResponse("Zonas guardadas", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const { zonas } = await c.req.json()
    const restaurante = await db.restaurante.findUnique({ where: { tenantId }, select: { id: true, contactoPublico: true } })
    if (restaurante) {
      const contacto = (restaurante.contactoPublico as Record<string, unknown>) ?? {}
      await db.restaurante.update({
        where: { tenantId },
        data: { contactoPublico: { ...contacto, zonas } },
      })
    }
    return c.json({ ok: true }, 201)
  },
)

// ─── GET /api/tenant/puntos-de-venta ─────────────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "get",
    path: "/puntos-de-venta",
    operationId: "wizard_listar_pdv",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de puntos de venta", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const pdv = await db.puntosDeVenta.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    })
    return c.json({ data: pdv })
  },
)

// ─── POST /api/tenant/puntos-de-venta ────────────────────────────────────────

const PdvCreateSchema = z.object({
  nombre: z.string().min(1),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  sucursal: z.string().optional(),
  tipo: z.string().optional(),
})

wizardRouter.openapi(
  createRoute({
    method: "post",
    path: "/puntos-de-venta",
    operationId: "wizard_crear_pdv",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: PdvCreateSchema } } },
    },
    responses: {
      201: createdResponse("Punto de venta creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = PdvCreateSchema.parse(await c.req.json())
    try {
      const pdv = await db.puntosDeVenta.create({
        data: { tenantId, ...body, createdById: session.user.id },
      })
      return c.json(pdv, 201)
    } catch {
      return c.json({ error: "PDV_DUPLICADO", message: "Ya existe un punto de venta con ese nombre." }, 409)
    }
  },
)

// ─── PATCH /api/tenant/puntos-de-venta/{id} ──────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "patch",
    path: "/puntos-de-venta/{id}",
    operationId: "wizard_actualizar_pdv",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: PdvCreateSchema.partial() } } },
    },
    responses: {
      200: okResponse("Punto de venta actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const id = c.req.param("id")
    const body = PdvCreateSchema.partial().parse(await c.req.json())
    const pdv = await db.puntosDeVenta.findFirst({ where: { id, tenantId } })
    if (!pdv) return c.json({ error: "PDV_NO_ENCONTRADO", message: "Punto de venta no encontrado." }, 404)
    const updated = await db.puntosDeVenta.update({
      where: { id },
      data: { ...body, updatedById: session.user.id },
    })
    return c.json(updated)
  },
)

// ─── DELETE /api/tenant/puntos-de-venta/{id} ─────────────────────────────────

wizardRouter.openapi(
  createRoute({
    method: "delete",
    path: "/puntos-de-venta/{id}",
    operationId: "wizard_eliminar_pdv",
    tags: ["Wizard"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "owner", "ADMIN"])],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Punto de venta eliminado", z.object({ deleted: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const id = c.req.param("id")
    const pdv = await db.puntosDeVenta.findFirst({ where: { id, tenantId } })
    if (!pdv) return c.json({ error: "PDV_NO_ENCONTRADO", message: "Punto de venta no encontrado." }, 404)

    // Si ya tiene ventas o aperturas/cierres de caja asociados, eliminar en
    // cascada borraría ese historial — desactivamos en vez de eliminar.
    const [ventasCount, aperturasCount] = await Promise.all([
      db.venta.count({ where: { puntoVentaId: id, tenantId } }),
      db.aperturaCierreDeCaja.count({ where: { puntoVentaId: id, tenantId } }),
    ])
    if (ventasCount > 0 || aperturasCount > 0) {
      await db.puntosDeVenta.update({ where: { id }, data: { estado: "INACTIVO" } })
      return c.json({ deleted: false })
    }

    await db.puntosDeVenta.delete({ where: { id } })
    return c.json({ deleted: true })
  },
)
