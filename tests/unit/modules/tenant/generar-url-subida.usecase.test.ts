import { describe, it, expect, beforeEach } from "vitest"
import { GenerarUrlSubidaUseCase } from "../../../../src/modules/tenant/application/generar-url-subida.usecase.js"
import { FakeAlmacenamientoPort } from "../../../helpers/fake-almacenamiento.port.js"
import { PropositoInvalido, TipoMimeNoPermitido, TamanoExcedido } from "../../../../src/modules/tenant/domain/tenant-upload.errors.js"

const TENANT_A = "tenant-a"
const TENANT_B = "tenant-b"

describe("GenerarUrlSubidaUseCase", () => {
  let port: FakeAlmacenamientoPort
  let useCase: GenerarUrlSubidaUseCase

  beforeEach(() => {
    port = new FakeAlmacenamientoPort()
    useCase = new GenerarUrlSubidaUseCase(port)
  })

  it("emite uploadUrl y publicUrl para una imagen de producto válida", async () => {
    const resultado = await useCase.ejecutar({
      tenantId: TENANT_A,
      tipo: "catalogo-imagen",
      filename: "producto.jpg",
      contentType: "image/jpeg",
      size: 2 * 1024 * 1024,
    })

    expect(resultado.uploadUrl).toContain("tenants/tenant-a/imagenesProductos/")
    expect(resultado.publicUrl).toContain("tenants/tenant-a/imagenesProductos/")
  })

  it("construye una key con extensión derivada del contentType", async () => {
    await useCase.ejecutar({
      tenantId: TENANT_A,
      tipo: "catalogo-imagen",
      filename: "producto.png",
      contentType: "image/png",
      size: 1024,
    })

    expect(port.llamadas[0]?.key).toMatch(/\.png$/)
  })

  it("genera una key única en cada llamada (FR-006)", async () => {
    const primero = await useCase.ejecutar({
      tenantId: TENANT_A,
      tipo: "catalogo-imagen",
      filename: "producto.jpg",
      contentType: "image/jpeg",
      size: 1024,
    })
    const segundo = await useCase.ejecutar({
      tenantId: TENANT_A,
      tipo: "catalogo-imagen",
      filename: "producto.jpg",
      contentType: "image/jpeg",
      size: 1024,
    })

    expect(primero.publicUrl).not.toBe(segundo.publicUrl)
  })

  it("delega al puerto con el TTL corto esperado", async () => {
    await useCase.ejecutar({
      tenantId: TENANT_A,
      tipo: "catalogo-imagen",
      filename: "producto.jpg",
      contentType: "image/jpeg",
      size: 1024,
    })

    expect(port.llamadas[0]?.expiresInSeconds).toBe(300)
    expect(port.llamadas[0]?.contentType).toBe("image/jpeg")
  })

  it("no mezcla el namespace de dos tenants distintos (US2-AS2, SC-003)", async () => {
    const deA = await useCase.ejecutar({
      tenantId: TENANT_A,
      tipo: "logo",
      filename: "logo.png",
      contentType: "image/png",
      size: 1024,
    })
    const deB = await useCase.ejecutar({
      tenantId: TENANT_B,
      tipo: "logo",
      filename: "logo.png",
      contentType: "image/png",
      size: 1024,
    })

    expect(deA.publicUrl).toContain(`tenants/${TENANT_A}/logoTenant/`)
    expect(deB.publicUrl).toContain(`tenants/${TENANT_B}/logoTenant/`)
    expect(deA.publicUrl).not.toBe(deB.publicUrl)
  })

  // ─── US3 — rechazos ────────────────────────────────────────────────────────

  it("rechaza un propósito que no existe en el registro", async () => {
    await expect(
      useCase.ejecutar({
        tenantId: TENANT_A,
        tipo: "documento-legal",
        filename: "algo.pdf",
        contentType: "application/pdf",
        size: 1024,
      }),
    ).rejects.toBeInstanceOf(PropositoInvalido)
    expect(port.llamadas).toHaveLength(0)
  })

  it("rechaza un contentType no permitido y el mensaje lista los tipos aceptados", async () => {
    await expect(
      useCase.ejecutar({
        tenantId: TENANT_A,
        tipo: "catalogo-imagen",
        filename: "malware.exe",
        contentType: "application/x-msdownload",
        size: 1024,
      }),
    ).rejects.toMatchObject({
      code: "TIPO_MIME_NO_PERMITIDO",
      message: expect.stringContaining("image/jpeg"),
    })
    expect(port.llamadas).toHaveLength(0)
  })

  it("rechaza un tamaño que excede el máximo del propósito y el mensaje indica el límite", async () => {
    const proposito5MB = 5 * 1024 * 1024
    await expect(
      useCase.ejecutar({
        tenantId: TENANT_A,
        tipo: "catalogo-imagen",
        filename: "enorme.jpg",
        contentType: "image/jpeg",
        size: proposito5MB + 1,
      }),
    ).rejects.toMatchObject({
      code: "TAMANO_EXCEDIDO",
      message: expect.stringContaining(String(proposito5MB)),
    })
    expect(port.llamadas).toHaveLength(0)
  })

  it("las 3 clases de error de dominio se pueden distinguir por instancia (FR-011)", async () => {
    const errores = await Promise.all([
      useCase
        .ejecutar({ tenantId: TENANT_A, tipo: "inexistente", filename: "a", contentType: "a", size: 1 })
        .catch((e: unknown) => e),
      useCase
        .ejecutar({ tenantId: TENANT_A, tipo: "logo", filename: "a", contentType: "application/pdf", size: 1 })
        .catch((e: unknown) => e),
      useCase
        .ejecutar({ tenantId: TENANT_A, tipo: "logo", filename: "a", contentType: "image/png", size: 999_999_999 })
        .catch((e: unknown) => e),
    ])

    expect(errores[0]).toBeInstanceOf(PropositoInvalido)
    expect(errores[1]).toBeInstanceOf(TipoMimeNoPermitido)
    expect(errores[2]).toBeInstanceOf(TamanoExcedido)
  })
})
