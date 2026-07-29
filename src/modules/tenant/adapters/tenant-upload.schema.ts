import { z } from "@hono/zod-openapi"

export const SolicitudUploadUrlSchema = z.object({
  tipo: z.string().min(1).openapi({ example: "catalogo-imagen" }),
  filename: z.string().min(1).openapi({ example: "producto.jpg" }),
  contentType: z.string().min(1).openapi({ example: "image/jpeg" }),
  size: z.number().int().positive().openapi({ example: 204800 }),
})

export const UploadUrlResponseSchema = z.object({
  uploadUrl: z.string().openapi({ example: "https://<account>.r2.cloudflarestorage.com/vendora/..." }),
  publicUrl: z.string().openapi({ example: "https://cdn.vendora.app/tenants/.../imagenesProductos/x.jpg" }),
})
