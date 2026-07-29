import { describe, it, expect, vi } from "vitest"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
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
})
