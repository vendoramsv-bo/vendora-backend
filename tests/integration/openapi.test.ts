import { describe, it, expect } from "vitest"
import { crearApp } from "../../src/server/hono.js"

describe("OpenAPI spec", () => {
  it("GET /api/openapi.json tiene más de 100 paths", async () => {
    const app = crearApp()
    const res = await app.request("/api/openapi.json")
    const spec = await res.json()
    expect(Object.keys(spec.paths).length).toBeGreaterThan(100)
  })

  it("todos los operationId son únicos", async () => {
    const app = crearApp()
    const res = await app.request("/api/openapi.json")
    const spec = await res.json()

    const operationIds: string[] = []
    for (const pathItem of Object.values(spec.paths)) {
      for (const operation of Object.values(pathItem as object)) {
        if ((operation as any).operationId) {
          operationIds.push((operation as any).operationId)
        }
      }
    }

    const uniqueIds = new Set(operationIds)
    expect(uniqueIds.size).toBe(operationIds.length)
  })
})
