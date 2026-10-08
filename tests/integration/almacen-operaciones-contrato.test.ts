/**
 * Contrato OpenAPI de ingresos, salidas, recuentos e insumos de almacén (spec 033).
 *
 * El frontend se genera desde /api/openapi.json: lo que no está declarado acá no existe
 * para el cliente tipado.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { crearApp } from "../../src/server/hono.js"

type Operacion = {
  operationId?: string
  parameters?: Array<{ name: string; in: string; required?: boolean }>
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

function admiteNull(prop: { nullable?: boolean; type?: string | string[] } | undefined) {
  return !!prop && (prop.nullable === true || (Array.isArray(prop.type) && prop.type.includes("null")))
}

describe.each([
  ["/api/almacen/ingresos/{ingresoId}", "ingresoId", "almacen_eliminar_ingreso"],
  ["/api/almacen/salidas/{salidaId}", "salidaId", "almacen_eliminar_salida"],
])("B-02 — DELETE %s", (path, param, operationId) => {
  it("está declarada con su operationId, el parámetro de ruta y 204", () => {
    const o = op(path, "delete")
    expect(o.operationId).toBe(operationId)
    expect(o.parameters?.some((p) => p.in === "path" && p.name === param)).toBe(true)
    expect(Object.keys(o.responses)).toContain("204")
  })
})

describe.each([
  ["/api/almacen/ingresos", "post"],
  ["/api/almacen/ingresos/{ingresoId}", "patch"],
  ["/api/almacen/salidas", "post"],
  ["/api/almacen/salidas/{salidaId}", "patch"],
  ["/api/almacen/recuentos-insumos", "post"],
])("B-03 — %s %s acepta fecha", (path, metodo) => {
  it("declara `fecha` en el cuerpo", () => {
    expect(Object.keys(propiedadesCuerpo(op(path, metodo)))).toContain("fecha")
  })
})

describe.each([
  ["/api/almacen/ingresos/{ingresoId}", "descripcion"],
  ["/api/almacen/salidas/{salidaId}", "descripcion"],
  ["/api/almacen/salidas/{salidaId}", "motivo"],
])("B-03 — PATCH %s", (path, campo) => {
  it(`\`${campo}\` admite null para vaciarlo`, () => {
    expect(admiteNull(propiedadesCuerpo(op(path, "patch"))[campo])).toBe(true)
  })
})

describe("B-05 — ciclo del recuento de almacén", () => {
  const path = "/api/almacen/recuentos-insumos/{recuentoId}"

  it.each([
    ["get", "almacen_obtener_recuento_almacen"],
    ["patch", "almacen_actualizar_recuento_almacen"],
    ["delete", "almacen_eliminar_recuento_almacen"],
  ])("%s está declarada con el parámetro de ruta", (metodo, operationId) => {
    const o = op(path, metodo)
    expect(o.operationId).toBe(operationId)
    expect(o.parameters?.some((p) => p.in === "path" && p.name === "recuentoId")).toBe(true)
  })

  it("aprobar está declarada y pide la versión", () => {
    const o = op(`${path}/aprobar`, "post")
    expect(o.operationId).toBe("almacen_aprobar_recuento_almacen")
    expect(Object.keys(propiedadesCuerpo(o))).toContain("version")
  })

  it("el PATCH acepta fecha, detalles y observación null", () => {
    const props = propiedadesCuerpo(op(path, "patch"))
    expect(Object.keys(props)).toEqual(expect.arrayContaining(["fecha", "detalles", "observacion"]))
    expect(admiteNull(props.observacion)).toBe(true)
  })
})

describe("B-04 — GET /api/almacen/insumos/{id}/movimientos/resumen", () => {
  it("está declarada con el parámetro de ruta", () => {
    const o = op("/api/almacen/insumos/{id}/movimientos/resumen", "get")
    expect(o.operationId).toBe("almacen_resumen_movimientos_insumo")
    expect(o.parameters?.some((p) => p.in === "path" && p.name === "id")).toBe(true)
  })
})
