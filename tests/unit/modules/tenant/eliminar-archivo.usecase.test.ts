import { describe, it, expect, beforeEach } from "vitest"
import { EliminarArchivoUseCase } from "../../../../src/modules/tenant/application/eliminar-archivo.usecase.js"
import { FakeAlmacenamientoPort } from "../../../helpers/fake-almacenamiento.port.js"
import { ReferenciaArchivoInvalida, ArchivoNoPerteneceATenant } from "../../../../src/modules/tenant/domain/tenant-upload.errors.js"

const TENANT_A = "tenant-a"
const TENANT_B = "tenant-b"

describe("EliminarArchivoUseCase", () => {
  let port: FakeAlmacenamientoPort
  let useCase: EliminarArchivoUseCase

  beforeEach(() => {
    port = new FakeAlmacenamientoPort()
    useCase = new EliminarArchivoUseCase(port)
  })

  // ─── US1 — camino feliz ────────────────────────────────────────────────────

  it("elimina un archivo propio del tenant a partir de su publicUrl", async () => {
    const url = "https://cdn.fake.local/tenants/tenant-a/imagenesProductos/uuid.jpg"

    await useCase.ejecutar({ tenantId: TENANT_A, url })

    expect(port.eliminaciones).toEqual(["tenants/tenant-a/imagenesProductos/uuid.jpg"])
  })

  // ─── US2 — aislamiento entre tenants ───────────────────────────────────────

  it("rechaza eliminar un archivo de otro tenant sin llamar a eliminarArchivo", async () => {
    const urlDeB = "https://cdn.fake.local/tenants/tenant-b/imagenesProductos/uuid.jpg"

    await expect(
      useCase.ejecutar({ tenantId: TENANT_A, url: urlDeB }),
    ).rejects.toBeInstanceOf(ArchivoNoPerteneceATenant)
    expect(port.eliminaciones).toHaveLength(0)
  })

  // ─── US3 — idempotencia ────────────────────────────────────────────────────

  it("resuelve sin error aunque el archivo ya no exista (idempotente, FR-004)", async () => {
    const url = "https://cdn.fake.local/tenants/tenant-a/imagenesProductos/ya-borrado.jpg"

    await useCase.ejecutar({ tenantId: TENANT_A, url })
    await expect(useCase.ejecutar({ tenantId: TENANT_A, url })).resolves.toBeUndefined()
    expect(port.eliminaciones).toEqual([
      "tenants/tenant-a/imagenesProductos/ya-borrado.jpg",
      "tenants/tenant-a/imagenesProductos/ya-borrado.jpg",
    ])
  })

  // ─── Referencias inválidas ──────────────────────────────────────────────────

  it("rechaza una url que no pertenece a este almacenamiento", async () => {
    await expect(
      useCase.ejecutar({ tenantId: TENANT_A, url: "https://example.com/no-es-de-nuestro-bucket.jpg" }),
    ).rejects.toBeInstanceOf(ReferenciaArchivoInvalida)
    expect(port.eliminaciones).toHaveLength(0)
  })

  it("rechaza una key con un número de segmentos distinto al esperado", async () => {
    const urlMalformada = "https://cdn.fake.local/tenants/tenant-a/archivo-sin-carpeta.jpg"

    await expect(
      useCase.ejecutar({ tenantId: TENANT_A, url: urlMalformada }),
    ).rejects.toBeInstanceOf(ReferenciaArchivoInvalida)
    expect(port.eliminaciones).toHaveLength(0)
  })

  it("rechaza una key que no empieza con el segmento 'tenants'", async () => {
    const urlMalformada = "https://cdn.fake.local/otracosa/tenant-a/imagenesProductos/uuid.jpg"

    await expect(
      useCase.ejecutar({ tenantId: TENANT_A, url: urlMalformada }),
    ).rejects.toBeInstanceOf(ReferenciaArchivoInvalida)
    expect(port.eliminaciones).toHaveLength(0)
  })
})
