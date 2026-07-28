/**
 * Integration test — DELETE /api/tenant/archivo (specs/020-eliminar-archivo-r2).
 *
 * Mismo patrón que upload-url.test.ts (019): stateless, sin Testcontainers;
 * requireAuth/requireTenantActivo se sustituyen por stubs livianos para
 * ejercer el router real (tenantUploadRouter) de punta a punta.
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../../src/core/hono-context.js"

const authState = vi.hoisted(() => ({
  autenticado: true,
  tenantId: "tenant-a" as string | null,
  userId: "user-1",
}))

vi.mock("../../../../src/core/hono-context.js", () => ({
  requireAuth: async (c: import("hono").Context, next: () => Promise<void>) => {
    if (!authState.autenticado) {
      return c.json({ error: "UNAUTHORIZED", message: "Se requiere autenticación" }, 401)
    }
    c.set("session", { user: { id: authState.userId } })
    await next()
  },
  requireTenantActivo: async (c: import("hono").Context, next: () => Promise<void>) => {
    if (!authState.tenantId) {
      return c.json({ error: "SIN_TENANT_ACTIVO", message: "No hay un tenant activo en la sesión" }, 400)
    }
    c.set("tenantId", authState.tenantId)
    await next()
  },
}))

const { tenantUploadRouter } = await import("../../../../src/modules/tenant/adapters/tenant-upload.rest.js")
const { setAlmacenamientoPort } = await import(
  "../../../../src/modules/tenant/infrastructure/almacenamiento.port.provider.js"
)
const { FakeAlmacenamientoPort } = await import("../../../helpers/fake-almacenamiento.port.js")

function construirApp() {
  const app = new OpenAPIHono<HonoEnv>()
  app.route("/api/tenant", tenantUploadRouter)
  return app
}

function del(app: OpenAPIHono<HonoEnv>, body: unknown) {
  return app.request("/api/tenant/archivo", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const URL_TENANT_A = "https://cdn.fake.local/tenants/tenant-a/imagenesProductos/x.jpg"

describe("DELETE /api/tenant/archivo", () => {
  beforeEach(() => {
    authState.autenticado = true
    authState.tenantId = "tenant-a"
    setAlmacenamientoPort(new FakeAlmacenamientoPort())
  })

  // ─── US1 — camino feliz ───────────────────────────────────────────────────

  it("devuelve 200 { eliminado: true } al eliminar un archivo propio", async () => {
    const res = await del(construirApp(), { url: URL_TENANT_A })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { eliminado: boolean }
    expect(json.eliminado).toBe(true)
  })

  it("401 sin sesión activa, sin eliminar nada", async () => {
    authState.autenticado = false
    const res = await del(construirApp(), { url: URL_TENANT_A })
    expect(res.status).toBe(401)
  })

  it("400 SIN_TENANT_ACTIVO sin tenant activo, sin eliminar nada", async () => {
    authState.tenantId = null
    const res = await del(construirApp(), { url: URL_TENANT_A })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe("SIN_TENANT_ACTIVO")
  })

  it("400 REFERENCIA_INVALIDA con una url que no pertenece a este almacenamiento", async () => {
    const res = await del(construirApp(), { url: "https://example.com/no-es-de-nuestro-bucket.jpg" })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe("REFERENCIA_INVALIDA")
  })

  it("400 de validación con un body sin url", async () => {
    const res = await del(construirApp(), {})
    expect(res.status).toBe(400)
  })

  // ─── US2 — aislamiento entre tenants ───────────────────────────────────────

  it("403 ARCHIVO_NO_PERTENECE_A_TENANT al intentar eliminar un archivo de otro tenant", async () => {
    const urlDeB = "https://cdn.fake.local/tenants/tenant-b/imagenesProductos/x.jpg"
    const res = await del(construirApp(), { url: urlDeB })
    expect(res.status).toBe(403)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe("ARCHIVO_NO_PERTENECE_A_TENANT")
  })

  // ─── US3 — idempotencia ────────────────────────────────────────────────────

  it("dos llamadas seguidas a la misma url devuelven 200 { eliminado: true } ambas veces", async () => {
    const app = construirApp()
    const primera = await del(app, { url: URL_TENANT_A })
    const segunda = await del(app, { url: URL_TENANT_A })

    expect(primera.status).toBe(200)
    expect(segunda.status).toBe(200)
    expect(((await segunda.json()) as { eliminado: boolean }).eliminado).toBe(true)
  })
})
