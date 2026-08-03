import { describe, it, expect } from "vitest"
import { crearApp } from "../../src/server/hono.js"

/**
 * FR-002a / SC-014 (spec 018 — vitrina publica):
 *
 * La direccion publica de un comercio (`/tienda/{slug}`) tiene que sobrevivir a
 * cualquier edicion de su perfil: si el slug cambia, todos los enlaces ya
 * compartidos se rompen en silencio.
 *
 * Hoy eso se cumple por construccion — ningun endpoint expuesto acepta `slug` en
 * un cuerpo de actualizacion. Este test es el guardarrail: falla en cuanto
 * alguien agregue `slug` a un schema de escritura.
 *
 * El nombre visible (`name` / `nombreLargo` / `descripcion`) SI es editable
 * (FR-002b) y por eso no se controla aca.
 */

/** Un schema es "de escritura" si viaja en el requestBody de un POST/PUT/PATCH. */
const METODOS_DE_ESCRITURA = ["post", "put", "patch"]

/** Resuelve `$ref` de OpenAPI contra los componentes del spec. */
function resolverRef(spec: any, nodo: any, vistos = new Set<string>()): any {
  if (!nodo || typeof nodo !== "object") return nodo
  if (typeof nodo.$ref === "string") {
    if (vistos.has(nodo.$ref)) return {}
    vistos.add(nodo.$ref)
    const partes = nodo.$ref.replace(/^#\//, "").split("/")
    let actual = spec
    for (const parte of partes) actual = actual?.[parte]
    return resolverRef(spec, actual, vistos)
  }
  return nodo
}

/** Junta todos los nombres de propiedad de un schema, recursivamente. */
function recolectarPropiedades(spec: any, schema: any, vistos = new Set<any>()): string[] {
  const resuelto = resolverRef(spec, schema)
  if (!resuelto || typeof resuelto !== "object" || vistos.has(resuelto)) return []
  vistos.add(resuelto)

  const nombres: string[] = []
  if (resuelto.properties && typeof resuelto.properties === "object") {
    for (const [nombre, sub] of Object.entries(resuelto.properties)) {
      nombres.push(nombre)
      nombres.push(...recolectarPropiedades(spec, sub, vistos))
    }
  }
  for (const clave of ["allOf", "anyOf", "oneOf"]) {
    for (const sub of resuelto[clave] ?? []) {
      nombres.push(...recolectarPropiedades(spec, sub, vistos))
    }
  }
  if (resuelto.items) nombres.push(...recolectarPropiedades(spec, resuelto.items, vistos))
  return nombres
}

describe("FR-002a — el slug de un comercio es inmutable", () => {
  it("ningun cuerpo de actualizacion expuesto acepta `slug`", async () => {
    const app = crearApp()
    const res = await app.request("/api/openapi.json")
    const spec = await res.json()

    const infractores: string[] = []

    for (const [ruta, itemRuta] of Object.entries<any>(spec.paths ?? {})) {
      for (const metodo of METODOS_DE_ESCRITURA) {
        const operacion = itemRuta?.[metodo]
        const schema = operacion?.requestBody?.content?.["application/json"]?.schema
        if (!schema) continue

        const propiedades = recolectarPropiedades(spec, schema)
        if (propiedades.includes("slug")) {
          infractores.push(`${metodo.toUpperCase()} ${ruta} (${operacion.operationId ?? "sin operationId"})`)
        }
      }
    }

    expect(
      infractores,
      `Estos endpoints permiten escribir \`slug\` y romperian las direcciones publicas ya compartidas:\n  ${infractores.join("\n  ")}`,
    ).toEqual([])
  })

  it("el nombre visible del comercio si es editable (FR-002b)", async () => {
    const app = crearApp()
    const res = await app.request("/api/openapi.json")
    const spec = await res.json()

    const editables = new Set<string>()
    for (const itemRuta of Object.values<any>(spec.paths ?? {})) {
      for (const metodo of METODOS_DE_ESCRITURA) {
        const schema = itemRuta?.[metodo]?.requestBody?.content?.["application/json"]?.schema
        if (!schema) continue
        for (const propiedad of recolectarPropiedades(spec, schema)) editables.add(propiedad)
      }
    }

    // Si esto falla, el spec dejo de exponer la edicion de identidad del comercio
    // y el test de arriba pasaria por vacio.
    expect(
      ["nombreLargo", "descripcion", "name", "nombre"].some((campo) => editables.has(campo)),
    ).toBe(true)
  })
})
