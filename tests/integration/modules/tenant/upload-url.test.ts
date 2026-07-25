/**
 * Integration test — POST /api/tenant/upload-url (specs/019-upload-r2-presigned).
 *
 * Esta feature es stateless (sin tablas Prisma, ver plan.md), así que no usa
 * Testcontainers. `requireAuth`/`requireTenantActivo` (core/hono-context.ts)
 * dependen de Better-Auth + Postgres real para resolver la sesión — eso ya
 * está cubierto por sus propios tests. Acá se sustituyen por stubs livianos
 * (vía `vi.mock`) que reproducen sus mismos efectos de contexto/respuesta,
 * para poder ejercer el router real (`tenantUploadRouter`) de punta a punta
 * sin una base de datos.
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

function post(app: OpenAPIHono<HonoEnv>, body: unknown) {
  return app.request("/api/tenant/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const BODY_VALIDO = {
  tipo: "catalogo-imagen",
  filename: "producto.jpg",
  contentType: "image/jpeg",
  size: 204800,
}

describe("POST /api/tenant/upload-url", () => {
  beforeEach(() => {
    authState.autenticado = true
    authState.tenantId = "tenant-a"
    setAlmacenamientoPort(new FakeAlmacenamientoPort())
  })

  // ─── US1 — camino feliz ───────────────────────────────────────────────────

  it("devuelve 200 con uploadUrl y publicUrl bajo tenants/{tenantId}/imagenesProductos/", async () => {
    const res = await post(construirApp(), BODY_VALIDO)
    expect(res.status).toBe(200)
    const json = (await res.json()) as { uploadUrl: string; publicUrl: string }
    expect(json.uploadUrl).toContain("tenants/tenant-a/imagenesProductos/")
    expect(json.publicUrl).toContain("tenants/tenant-a/imagenesProductos/")
  })

  // ─── US3 — rechazos ────────────────────────────────────────────────────────

  it("401 sin sesión activa, sin emitir uploadUrl", async () => {
    authState.autenticado = false
    const res = await post(construirApp(), BODY_VALIDO)
    expect(res.status).toBe(401)
    const json = (await res.json()) as Record<string, unknown>
    expect(json.uploadUrl).toBeUndefined()
  })

  it("400 SIN_TENANT_ACTIVO sin tenant activo, sin emitir uploadUrl", async () => {
    authState.tenantId = null
    const res = await post(construirApp(), BODY_VALIDO)
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string; uploadUrl?: string }
    expect(json.error).toBe("SIN_TENANT_ACTIVO")
    expect(json.uploadUrl).toBeUndefined()
  })

  it("400 PROPOSITO_INVALIDO con un tipo inexistente, sin emitir uploadUrl", async () => {
    const res = await post(construirApp(), { ...BODY_VALIDO, tipo: "documento-legal" })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string; uploadUrl?: string }
    expect(json.error).toBe("PROPOSITO_INVALIDO")
    expect(json.uploadUrl).toBeUndefined()
  })

  it("400 TIPO_MIME_NO_PERMITIDO con un contentType no permitido, sin emitir uploadUrl", async () => {
    const res = await post(construirApp(), { ...BODY_VALIDO, contentType: "application/x-msdownload" })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string; message: string; uploadUrl?: string }
    expect(json.error).toBe("TIPO_MIME_NO_PERMITIDO")
    expect(json.message).toContain("image/jpeg")
    expect(json.uploadUrl).toBeUndefined()
  })

  it("400 TAMANO_EXCEDIDO con un tamaño mayor al máximo, sin emitir uploadUrl", async () => {
    const res = await post(construirApp(), { ...BODY_VALIDO, size: 999_999_999 })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string; message: string; uploadUrl?: string }
    expect(json.error).toBe("TAMANO_EXCEDIDO")
    expect(json.uploadUrl).toBeUndefined()
  })

  it("400 de validación con un body incompleto (falta size), sin emitir uploadUrl", async () => {
    const { size: _size, ...sinSize } = BODY_VALIDO
    const res = await post(construirApp(), sinSize)
    expect(res.status).toBe(400)
    const json = (await res.json()) as { uploadUrl?: string }
    expect(json.uploadUrl).toBeUndefined()
  })

  // ─── US2 — aislamiento entre tenants ───────────────────────────────────────

  it("dos tenants pidiendo 'logo' con el mismo filename no colisionan (SC-003)", async () => {
    const app = construirApp()

    authState.tenantId = "tenant-a"
    const resA = await post(app, { ...BODY_VALIDO, tipo: "logo", contentType: "image/png", filename: "logo.png" })
    const jsonA = (await resA.json()) as { publicUrl: string }

    authState.tenantId = "tenant-b"
    const resB = await post(app, { ...BODY_VALIDO, tipo: "logo", contentType: "image/png", filename: "logo.png" })
    const jsonB = (await resB.json()) as { publicUrl: string }

    expect(jsonA.publicUrl).toContain("tenants/tenant-a/logoTenant/")
    expect(jsonB.publicUrl).toContain("tenants/tenant-b/logoTenant/")
    expect(jsonA.publicUrl).not.toBe(jsonB.publicUrl)
  })
})
