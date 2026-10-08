/**
 * Contrato OpenAPI de ajustes y recuentos (spec 032).
 *
 * El frontend se genera desde /api/openapi.json: lo que no está declarado acá no existe
 * para el cliente tipado. Fija B-01 (eliminar pendientes) y B-02/B-04 (fecha, motivo y
 * observación vaciables).
 */
import { describe, it, expect, beforeAll } from "vitest"
import { crearApp } from "../../src/server/hono.js"

type Operacion = {
  operationId?: string
  parameters?: Array<{ name: string; in: string }>
  requestBody?: { content?: { "application/json"?: { schema?: { properties?: Record<string, { nullable?: boolean; type?: string | string[] }> } } } }
  responses: Record<string, unknown>
}

let paths: Record<string, Record<string, Operacion>>

beforeAll(async () => {
  const res = await crearApp().request("/api/openapi.json")
  paths = (await res.json()).paths
})

function op(path: string, metodo: string): Operacion {
  const o = paths[path]?.[metodo]
  expect(o, `${metodo.toUpperCase()} ${path} no está en el spec`).toBeDefined()
  return o!
}

function propiedadesCuerpo(o: Operacion) {
  return o.requestBody?.content?.["application/json"]?.schema?.properties ?? {}
}

describe.each([
  ["/api/almacen/ajustes/{ajusteId}", "ajusteId", "almacen_eliminar_ajuste_inventario"],
  ["/api/almacen/recuentos/{recuentoId}", "recuentoId", "almacen_eliminar_recuento_inventario"],
])("B-01 — DELETE %s", (path, param, operationId) => {
  it("está declarada con su operationId y el parámetro de ruta", () => {
    const o = op(path, "delete")
    expect(o.operationId).toBe(operationId)
    expect(o.parameters?.some((p) => p.in === "path" && p.name === param)).toBe(true)
  })

  it("responde 204 al eliminar", () => {
    const codigos = Object.keys(op(path, "delete").responses)
    expect(codigos).toContain("204")
  })
})

describe.each([
  ["/api/almacen/ajustes", "post"],
  ["/api/almacen/ajustes/{ajusteId}", "patch"],
  ["/api/almacen/recuentos", "post"],
  ["/api/almacen/recuentos/{recuentoId}", "patch"],
])("B-02 — %s %s acepta fecha", (path, metodo) => {
  it("declara `fecha` en el cuerpo", () => {
    expect(Object.keys(propiedadesCuerpo(op(path, metodo)))).toContain("fecha")
  })
})

describe.each([
  ["/api/almacen/ajustes/{ajusteId}", "motivo"],
  ["/api/almacen/recuentos/{recuentoId}", "observacion"],
])("B-04 — PATCH %s", (path, campo) => {
  it(`\`${campo}\` admite null para vaciarlo`, () => {
    const prop = propiedadesCuerpo(op(path, "patch"))[campo]
    expect(prop, `${campo} no está declarado`).toBeDefined()
    const admiteNull = prop!.nullable === true || (Array.isArray(prop!.type) && prop!.type.includes("null"))
    expect(admiteNull).toBe(true)
  })
})

describe("B-03 — GET /api/almacen/movimientos/resumen", () => {
  it("declara productoId requerido y varianteId opcional", () => {
    const o = op("/api/almacen/movimientos/resumen", "get")
    expect(o.operationId).toBe("almacen_resumen_movimientos_producto")
    const query = (o.parameters ?? []).filter((p) => p.in === "query") as Array<{ name: string; required?: boolean }>
    expect(query.find((p) => p.name === "productoId")?.required).toBe(true)
    expect(query.find((p) => p.name === "varianteId")?.required).toBeFalsy()
  })
})
