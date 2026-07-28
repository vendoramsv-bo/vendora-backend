import { describe, it, expect, vi, beforeEach } from "vitest"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { mockClient } from "aws-sdk-client-mock"
import { R2AlmacenamientoAdapter } from "../../../../src/modules/tenant/infrastructure/r2.almacenamiento.adapter.js"

// `getSignedUrl` no llama a `S3Client.send()` — calcula la firma localmente
// a partir del middleware stack del cliente. `aws-sdk-client-mock` (que
// intercepta `send()`) no aplica acá; se mockea el módulo del presigner
// completo con `vi.mock`, que es lo que realmente invoca el adaptador.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}))

describe("R2AlmacenamientoAdapter", () => {
  it("firma un PutObjectCommand con el bucket, key y contentType correctos", async () => {
    const s3 = new S3Client({ region: "auto" })
    const getSignedUrlMock = vi.mocked(getSignedUrl)
    getSignedUrlMock.mockResolvedValue(
      "https://r2.example.com/vendora/tenants/t1/imagenesProductos/x.jpg?X-Amz-Signature=abc",
    )

    const adapter = new R2AlmacenamientoAdapter({
      s3,
      bucket: "vendora",
      publicBaseUrl: "https://cdn.vendora.app",
    })

    const resultado = await adapter.emitirUrlSubida({
      key: "tenants/t1/imagenesProductos/x.jpg",
      contentType: "image/jpeg",
      expiresInSeconds: 300,
    })

    expect(getSignedUrlMock).toHaveBeenCalledTimes(1)
    const [, command, options] = getSignedUrlMock.mock.calls[0] as [S3Client, PutObjectCommand, { expiresIn: number }]
    expect(command.input.Bucket).toBe("vendora")
    expect(command.input.Key).toBe("tenants/t1/imagenesProductos/x.jpg")
    expect(command.input.ContentType).toBe("image/jpeg")
    expect(options.expiresIn).toBe(300)

    expect(resultado.uploadUrl).toContain("X-Amz-Signature")
    expect(resultado.publicUrl).toBe("https://cdn.vendora.app/tenants/t1/imagenesProductos/x.jpg")
  })

  describe("eliminarArchivo", () => {
    const s3Mock = mockClient(S3Client)

    beforeEach(() => {
      s3Mock.reset()
    })

    it("llama DeleteObjectCommand con el bucket y key correctos", async () => {
      s3Mock.on(DeleteObjectCommand).resolves({})

      const adapter = new R2AlmacenamientoAdapter({
        s3: new S3Client({ region: "auto" }),
        bucket: "vendora",
        publicBaseUrl: "https://cdn.vendora.app",
      })

      await adapter.eliminarArchivo("tenants/t1/imagenesProductos/x.jpg")

      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1)
      expect(s3Mock.commandCalls(DeleteObjectCommand)[0]?.args[0].input).toMatchObject({
        Bucket: "vendora",
        Key: "tenants/t1/imagenesProductos/x.jpg",
      })
    })
  })

  describe("extraerKeyDesdeUrlPublica", () => {
    const adapter = new R2AlmacenamientoAdapter({
      s3: new S3Client({ region: "auto" }),
      bucket: "vendora",
      publicBaseUrl: "https://cdn.vendora.app",
    })

    it("quita el prefijo publicBaseUrl y devuelve la key", () => {
      const key = adapter.extraerKeyDesdeUrlPublica(
        "https://cdn.vendora.app/tenants/t1/imagenesProductos/x.jpg",
      )
      expect(key).toBe("tenants/t1/imagenesProductos/x.jpg")
    })

    it("devuelve null si la url no empieza con publicBaseUrl", () => {
      const key = adapter.extraerKeyDesdeUrlPublica("https://otro-dominio.com/tenants/t1/x.jpg")
      expect(key).toBeNull()
    })
  })
})
