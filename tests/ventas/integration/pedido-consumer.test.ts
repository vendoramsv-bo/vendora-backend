import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Cambio B2 de la spec 019 — pedidos desde la vitrina pública.
 *
 * El riesgo que este cambio existe para cerrar: `POST /api/ventas/pedidos`
 * resuelve el comercio destinatario con `c.get("tenantId")`, o sea el tenant
 * **activo de quien llama**. Un visitante parado en la vitrina de otro comercio
 * no tiene ese contexto —o tiene el suyo—, así que su pedido iría al lugar
 * equivocado, en silencio.
 *
 * La ruta nueva lo resuelve desde el **slug de la ruta**. Estos tests son los que
 * hacen verificables SC-003 (el pedido llega con lo que el visitante confirmó) y
 * SC-004 (nunca llega a otro comercio).
 */

const TENANT_VISITADO = "tenant-del-comercio-visitado"
const TENANT_DEL_VISITANTE = "tenant-propio-del-visitante"
const USER_ID = "user-visitante"
const SLUG = "la-esquina"

const tenantFindFirst = vi.fn()
const productoFindMany = vi.fn()
const crearPedido = vi.fn()

vi.mock("../../../src/modules/autenticacion/infrastructure/better-auth.setup.js", () => ({
  prisma: {
    tenant: { findFirst: (...a: unknown[]) => tenantFindFirst(...a) },
    producto: { findMany: (...a: unknown[]) => productoFindMany(...a) },
  },
}))

// El acuse de recibo del pedido crea una notificación, y ese repositorio usa
// `prisma-scoped`, otro cliente distinto del de arriba (spec 019 B7).
const notificacionCreate = vi.fn()
vi.mock("../../../src/core/prisma-scoped.js", () => ({
  prismaBase: {
    notificacion: {
      create: (...a: unknown[]) => notificacionCreate(...a),
      count: vi.fn(async () => 1),
    },
  },
}))

// El visitante SÍ tiene sesión, y su organización activa es OTRA: es exactamente
// el escenario que rompía con la ruta de staff.
vi.mock("../../../src/core/hono-context.js", async () => {
  const real = await vi.importActual<typeof import("../../../src/core/hono-context.js")>(
    "../../../src/core/hono-context.js",
  )
  return {
    ...real,
    requireAuth: async (c: any, next: any) => {
      c.set("session", {
        user: { id: USER_ID },
        session: { activeOrganizationId: TENANT_DEL_VISITANTE },
      })
      await next()
    },
  }
})

vi.mock("../../../src/modules/ventas/infrastructure/pedido.prisma.repository.js", () => ({
  PedidoPrismaRepository: class {
    crear = crearPedido
  },
}))

vi.mock("../../../src/modules/ventas/infrastructure/ventas.notificador.provider.js", () => ({
  getVentasNotificador: () => ({ pedidoActualizado: vi.fn() }),
}))

const { pedidoConsumerRouter } = await import(
  "../../../src/modules/ventas/adapters/pedido-consumer.rest.js"
)

const CUERPO_VALIDO = {
  detalles: [
    { productoId: "p1", precio: 12.5, cantidad: 2 },
    { productoId: "p2", precio: 8, cantidad: 1 },
  ],
}

function pedir(cuerpo: unknown, slug = SLUG) {
  return pedidoConsumerRouter.request(`/${slug}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantFindFirst.mockResolvedValue({ id: TENANT_VISITADO })
  productoFindMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }])
  crearPedido.mockImplementation(async (dto: { tenantId: string }) => ({
    id: "pedido-1",
    estado: "PENDIENTE",
    tenantId: dto.tenantId,
  }))
  notificacionCreate.mockResolvedValue({
    id: "n1",
    titulo: "Pedido enviado",
    mensaje: "Tu pedido llegó a la tienda.",
    fecha: new Date(),
    estado: "NO_LEIDO",
    referenciaTipo: "PEDIDO",
    referenciaId: "pedido-1",
  })
})

describe("POST /api/consumer/tiendas/{slug}/pedidos — destinatario (SC-004)", () => {
  it("crea el pedido contra el comercio del SLUG, no contra el del visitante", async () => {
    const res = await pedir(CUERPO_VALIDO)

    expect(res.status).toBe(201)
    expect(crearPedido).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_VISITADO, userId: USER_ID }),
    )
    // La garantía completa: el tenant del visitante no aparece por ningún lado.
    expect(crearPedido).not.toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_DEL_VISITANTE }),
    )
  })

  it("resuelve el comercio exigiendo esTienda y estado FINALIZADO", async () => {
    await pedir(CUERPO_VALIDO)

    expect(tenantFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: SLUG, esTienda: true, estado: "FINALIZADO" },
      }),
    )
  })

  it("un comercio a medio crear responde 404 y no crea nada", async () => {
    tenantFindFirst.mockResolvedValue(null)

    const res = await pedir(CUERPO_VALIDO)

    expect(res.status).toBe(404)
    expect(crearPedido).not.toHaveBeenCalled()
  })
})

describe("POST /api/consumer/tiendas/{slug}/pedidos — contenido (SC-003)", () => {
  it("manda las líneas con los productos y cantidades que el visitante confirmó", async () => {
    await pedir(CUERPO_VALIDO)

    expect(crearPedido).toHaveBeenCalledWith(
      expect.objectContaining({
        detalles: [
          expect.objectContaining({ productoId: "p1", cantidad: 2, precio: 12.5 }),
          expect.objectContaining({ productoId: "p2", cantidad: 1, precio: 8 }),
        ],
      }),
    )
  })

  it("rechaza un cuerpo sin líneas: un pedido vacío no es un pedido", async () => {
    const res = await pedir({ detalles: [] })

    expect(res.status).toBe(400)
    expect(crearPedido).not.toHaveBeenCalled()
  })
})

describe("POST /api/consumer/tiendas/{slug}/pedidos — líneas caídas (FR-019)", () => {
  it("responde 422 identificando el producto que ya no está disponible", async () => {
    // p2 se retiró entre que el visitante lo agregó y envió el pedido.
    productoFindMany.mockResolvedValue([{ id: "p1" }])

    const res = await pedir(CUERPO_VALIDO)
    const cuerpo = await res.json()

    expect(res.status).toBe(422)
    expect(cuerpo.lineas).toEqual([{ productoId: "p2", motivo: "NO_DISPONIBLE" }])
    expect(crearPedido).not.toHaveBeenCalled()
  })

  it("un producto de OTRO comercio cuenta como línea caída", async () => {
    // La consulta acota por tenantId, así que un producto ajeno no aparece entre
    // los disponibles: es lo que impide facturarle a este comercio algo que no es suyo.
    productoFindMany.mockResolvedValue([])

    const res = await pedir({ detalles: [{ productoId: "p-ajeno", precio: 5, cantidad: 1 }] })

    expect(res.status).toBe(422)
    expect(productoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_VISITADO, estado: "ACTIVO" }),
      }),
    )
  })
})

describe("POST /api/consumer/tiendas/{slug}/pedidos — acuse al visitante (FR-033)", () => {
  it("crea una notificación para quien hizo el pedido", async () => {
    await pedir(CUERPO_VALIDO)

    expect(notificacionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          tenantId: TENANT_VISITADO,
          referenciaTipo: "PEDIDO",
          referenciaId: "pedido-1",
        }),
      }),
    )
  })

  it("un pedido rechazado NO genera acuse", async () => {
    productoFindMany.mockResolvedValue([])

    await pedir(CUERPO_VALIDO)

    expect(notificacionCreate).not.toHaveBeenCalled()
  })
})
