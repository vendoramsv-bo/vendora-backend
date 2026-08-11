import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * `DELETE /api/tenant/actual` — 023 US3, contracts §A.4.
 *
 * Lo que estos tests protegen, en orden de importancia:
 *
 * 1. **ADMIN recibe 403.** Es la única capacidad que separa a un propietario de
 *    un administrador (FR-021). Si esto se afloja, los dos roles son el mismo.
 * 2. **La información se conserva.** La baja es lógica: ninguna fila de ventas
 *    ni de membresías se borra (FR-025). El borrado físico de Better-Auth haría
 *    cascada hasta los comprobantes.
 * 3. **La confirmación se valida en el servidor.** El diálogo del cliente evita
 *    el accidente; este chequeo evita el `curl`.
 */

const TENANT = "tenant-1"
const USER = "user-1"
const NOMBRE = "La Esquina"

const tenantMemberFindUnique = vi.fn()
const tenantFindUnique = vi.fn()
const tenantUpdate = vi.fn()
const auditLogCreate = vi.fn()
const transaction = vi.fn()

/** Espías de borrado real: si alguno se llama, la baja dejó de ser lógica. */
const tenantDelete = vi.fn()
const tenantMemberDeleteMany = vi.fn()
const ventaDeleteMany = vi.fn()

vi.mock("../../../src/modules/autenticacion/infrastructure/better-auth.setup.js", () => ({
  prisma: {
    tenantMember: {
      findUnique: (...a: unknown[]) => tenantMemberFindUnique(...a),
      deleteMany: (...a: unknown[]) => tenantMemberDeleteMany(...a),
    },
    venta: { deleteMany: (...a: unknown[]) => ventaDeleteMany(...a) },
    tenant: {
      findUnique: (...a: unknown[]) => tenantFindUnique(...a),
      update: (...a: unknown[]) => tenantUpdate(...a),
      delete: (...a: unknown[]) => tenantDelete(...a),
    },
    auditLog: { create: (...a: unknown[]) => auditLogCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
  auth: { api: { getSession: vi.fn() } },
}))

vi.mock("../../../src/core/prisma-scoped.js", () => ({
  crearPrismaScoped: () => ({}),
  prismaBase: {},
}))

vi.mock("../../../src/core/hono-context.js", async () => {
  const real = await vi.importActual<typeof import("../../../src/core/hono-context.js")>(
    "../../../src/core/hono-context.js",
  )
  return {
    ...real,
    requireAuth: async (c: any, next: any) => {
      c.set("session", { user: { id: USER }, session: { activeOrganizationId: TENANT } })
      c.set("usuario", { id: USER, name: "Dueña", email: "d@x.com", emailVerified: true })
      await next()
    },
  }
})

const { tenantRouter } = await import("../../../src/modules/tenant/adapters/tenant.rest.js")

function como(rol: string, estado = "ACTIVO") {
  tenantMemberFindUnique.mockResolvedValue({ id: "tm-1", role: rol, tenant: { estado } })
}

function eliminar(confirmacion: unknown) {
  return tenantRouter.request("/actual", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmacion }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantFindUnique.mockResolvedValue({ name: NOMBRE, estado: "ACTIVO" })
  transaction.mockResolvedValue([{}, {}])
})

describe("quién puede dar de baja el negocio (FR-021, FR-026)", () => {
  it("ADMIN recibe 403 aunque mande la confirmación correcta", async () => {
    como("ADMIN")
    const res = await eliminar(NOMBRE)
    expect(res.status).toBe(403)
    expect(transaction).not.toHaveBeenCalled()
  })

  it.each(["VENDEDOR", "BODEGUERO", "MEDICO", "RECEPCIONISTA", "ENCARGADO", "CHEF", "MESERO", "member"])(
    "el rol %s recibe 403",
    async (rol) => {
      como(rol)
      expect((await eliminar(NOMBRE)).status).toBe(403)
      expect(transaction).not.toHaveBeenCalled()
    },
  )

  it("PROPIETARIO puede", async () => {
    como("PROPIETARIO")
    expect((await eliminar(NOMBRE)).status).toBe(200)
  })

  it("owner es sinónimo de PROPIETARIO y también puede", async () => {
    como("owner")
    expect((await eliminar(NOMBRE)).status).toBe(200)
  })
})

describe("la confirmación se valida en el servidor (FR-022)", () => {
  it("un nombre que no coincide recibe 400 CONFIRMACION_INVALIDA", async () => {
    como("PROPIETARIO")
    const res = await eliminar("la esquina")
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("CONFIRMACION_INVALIDA")
    expect(transaction).not.toHaveBeenCalled()
  })

  it("un cuerpo sin confirmación recibe 400", async () => {
    como("PROPIETARIO")
    const res = await tenantRouter.request("/actual", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    expect(transaction).not.toHaveBeenCalled()
  })

  it("el nombre exacto sí pasa", async () => {
    como("PROPIETARIO")
    expect((await eliminar(NOMBRE)).status).toBe(200)
    expect(transaction).toHaveBeenCalled()
  })
})

describe("qué hace la baja (FR-025)", () => {
  it("deja el negocio en ELIMINADO y anota quién lo hizo", async () => {
    como("PROPIETARIO")
    await eliminar(NOMBRE)

    expect(tenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TENANT },
        data: { estado: "ELIMINADO", updatedById: USER },
      }),
    )
  })

  it("registra la baja en AuditLog", async () => {
    como("PROPIETARIO")
    await eliminar(NOMBRE)

    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT, userId: USER, accion: "DELETE" }),
      }),
    )
  })

  it("NO borra ventas, membresías ni ninguna otra fila", async () => {
    // El borrado físico de Better-Auth haría cascada TenantMember → Venta y se
    // llevaría los comprobantes. Acá la única escritura sobre datos es el
    // cambio de estado, más la entrada de auditoría.
    como("PROPIETARIO")
    await eliminar(NOMBRE)

    expect(tenantDelete).not.toHaveBeenCalled()
    expect(tenantMemberDeleteMany).not.toHaveBeenCalled()
    expect(ventaDeleteMany).not.toHaveBeenCalled()
    // La única escritura sobre datos es el cambio de estado.
    expect(tenantUpdate).toHaveBeenCalledTimes(1)
  })

  it("las dos escrituras van en una transacción: o pasan las dos, o ninguna", async () => {
    como("PROPIETARIO")
    await eliminar(NOMBRE)
    expect(transaction).toHaveBeenCalledTimes(1)
  })
})

describe("segunda llamada (idempotencia)", () => {
  it("un negocio ya eliminado responde 409", async () => {
    // `resolverMiembroActivo` corta antes con 403 cuando el negocio ya está de
    // baja; este caso cubre la carrera en la que el estado cambió entre el
    // middleware y el handler.
    como("PROPIETARIO")
    tenantFindUnique.mockResolvedValue({ name: NOMBRE, estado: "ELIMINADO" })
    const res = await eliminar(NOMBRE)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe("NEGOCIO_YA_ELIMINADO")
  })
})

describe("FR-024 — sobre un negocio de baja no prospera nada", () => {
  it("el middleware rechaza con 403 NEGOCIO_ELIMINADO antes de llegar al handler", async () => {
    // Ese rechazo, y no la ausencia del negocio en la lista, es lo que hace
    // verdadero FR-024.
    como("PROPIETARIO", "ELIMINADO")
    const res = await eliminar(NOMBRE)
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("NEGOCIO_ELIMINADO")
    expect(tenantFindUnique).not.toHaveBeenCalled()
  })
})
