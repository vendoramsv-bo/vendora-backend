/**
 * Contrato OpenAPI de las operaciones de movimientos (specs/020-movimientos-inventario-tenant).
 *
 * El frontend se genera desde /api/openapi.json: un parámetro que el handler
 * procesa pero el contrato no declara es inalcanzable desde el cliente tipado.
 * Estos tests fijan que lo declarado coincide con lo procesado (FR-011..FR-014).
 */
import { describe, it, expect, beforeAll } from "vitest"
import { crearApp } from "../../src/server/hono.js"

type Operacion = {
  operationId?: string
  parameters?: Array<{ name: string; in: string; schema?: { enum?: string[] } }>
  responses: Record<string, { content?: { "application/json"?: { schema?: { properties?: Record<string, unknown> } } } }>
}

const QUERY_PAGINADA = ["take", "skip", "orderBy", "order", "search", "filterField", "filterOp", "filterValue"]
const FORMA_PAGINADA = ["data", "total", "page", "take", "totalPaginas", "hayPaginaSiguiente", "hayPaginaAnterior"]

let paths: Record<string, Record<string, Operacion>>

beforeAll(async () => {
  const res = await crearApp().request("/api/openapi.json")
  paths = (await res.json()).paths
})

function get(path: string): Operacion {
  const op = paths[path]?.get
  expect(op, `GET ${path} no está en el spec`).toBeDefined()
  return op!
}

function queryParams(op: Operacion) {
  return (op.parameters ?? []).filter((p) => p.in === "query")
}

function propiedadesRespuesta(op: Operacion) {
  return Object.keys(op.responses["200"]?.content?.["application/json"]?.schema?.properties ?? {})
}

describe.each([
  ["/api/almacen/insumos/{id}/movimientos", "id", "almacen_listar_movimientos_insumo"],
  ["/api/almacen/variantes/{varianteId}/movimientos", "varianteId", "almacen_listar_movimientos_variante"],
])("US2 — GET %s", (path, paramRuta, operationId) => {
  it("conserva su operationId", () => {
    expect(get(path).operationId).toBe(operationId)
  })

  it("declara el parámetro de ruta", () => {
    expect(get(path).parameters?.some((p) => p.in === "path" && p.name === paramRuta)).toBe(true)
  })

  it("declara la query paginada que el handler procesa", () => {
    expect(queryParams(get(path)).map((p) => p.name).sort()).toEqual([...QUERY_PAGINADA].sort())
  })

  it("acota filterField a los campos permitidos", () => {
    const filterField = queryParams(get(path)).find((p) => p.name === "filterField")
    expect(filterField?.schema?.enum?.sort()).toEqual(["cantidad", "createdAt", "motivo", "tipo"])
  })

  it("declara la forma paginada uniforme", () => {
    expect(propiedadesRespuesta(get(path)).sort()).toEqual([...FORMA_PAGINADA].sort())
  })
})

describe("US1 — GET /api/almacen/movimientos", () => {
  const path = "/api/almacen/movimientos"

  it("existe con su operationId", () => {
    expect(get(path).operationId).toBe("almacen_listar_movimientos_tenant")
  })

  it("declara la query paginada y ningún parámetro de ruta", () => {
    const op = get(path)
    expect(queryParams(op).map((p) => p.name).sort()).toEqual([...QUERY_PAGINADA].sort())
    expect((op.parameters ?? []).some((p) => p.in === "path")).toBe(false)
  })

  it("acota filterField y orderBy", () => {
    const params = queryParams(get(path))
    expect(params.find((p) => p.name === "filterField")?.schema?.enum?.sort()).toEqual(
      ["cantidad", "createdAt", "motivo", "origen", "tipo"],
    )
    expect(params.find((p) => p.name === "orderBy")?.schema?.enum?.sort()).toEqual(["cantidad", "createdAt", "tipo"])
  })

  it("declara la forma paginada uniforme", () => {
    expect(propiedadesRespuesta(get(path)).sort()).toEqual([...FORMA_PAGINADA].sort())
  })
})
