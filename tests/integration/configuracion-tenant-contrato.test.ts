/**
 * Contrato de Configuración del negocio (specs/026-configuracion-tenant-api).
 *
 * Usa la app completa: `crearApp()` no monta las rutas de /api/tenant.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { crearAppCompleta } from "../../src/server/app.js"

type Schema = { properties?: Record<string, Schema>; enum?: string[]; items?: Schema; type?: string }
type Operacion = {
  operationId?: string
  parameters?: Array<{ name: string; in: string; schema?: Schema }>
  requestBody?: { content?: { "application/json"?: { schema?: Schema } } }
  responses: Record<string, { content?: { "application/json"?: { schema?: Schema } } }>
}

export const FORMA_PAGINADA = ["data", "hayPaginaAnterior", "hayPaginaSiguiente", "page", "take", "total", "totalPaginas"]

let paths: Record<string, Record<string, Operacion>>

beforeAll(async () => {
  const res = await crearAppCompleta().request("/api/openapi.json")
  paths = (await res.json()).paths
})

export function op(path: string, method: string): Operacion | undefined {
  return paths[path]?.[method.toLowerCase()]
}

export function get(path: string, method: string): Operacion {
  const o = op(path, method)
  expect(o, `${method.toUpperCase()} ${path} no está en el spec`).toBeDefined()
  return o!
}

export const queryParams = (o: Operacion) => (o.parameters ?? []).filter((p) => p.in === "query")
export const bodyProps = (o: Operacion) => Object.keys(o.requestBody?.content?.["application/json"]?.schema?.properties ?? {}).sort()
export const respuesta = (o: Operacion, status = "200") => o.responses[status]?.content?.["application/json"]?.schema
export const propiedadesRespuesta = (o: Operacion, status = "200") => Object.keys(respuesta(o, status)?.properties ?? {}).sort()
export const propiedadesItem = (o: Operacion) => Object.keys(respuesta(o)?.properties?.data?.items?.properties ?? {}).sort()

describe("US1 — miembros e invitaciones", () => {
  it.each([
    ["/api/tenant/invitaciones", "post"],
    ["/api/tenant/invitaciones/{id}", "delete"],
    ["/api/tenant/miembros/{id}/rol", "patch"],
    ["/api/tenant/miembros/{id}", "delete"],
  ])("%s %s existe", (path, method) => {
    get(path, method)
  })

  it("POST /invitaciones declara email y rol (enum)", () => {
    const o = get("/api/tenant/invitaciones", "post")
    expect(bodyProps(o)).toEqual(["email", "rol"])
    expect(o.requestBody?.content?.["application/json"]?.schema?.properties?.rol?.enum).toContain("VENDEDOR")
  })

  it("PATCH /miembros/{id}/rol declara rol", () => {
    expect(bodyProps(get("/api/tenant/miembros/{id}/rol", "patch"))).toEqual(["rol"])
  })

  it("GET /miembros incluye los campos que lee la pantalla", () => {
    const campos = propiedadesItem(get("/api/tenant/miembros", "get"))
    for (const c of ["rol", "nombreCompleto", "email", "estado", "joinedAt"]) expect(campos).toContain(c)
  })

  it("GET /invitaciones incluye rol", () => {
    expect(propiedadesItem(get("/api/tenant/invitaciones", "get"))).toContain("rol")
  })
})

describe("US2 — descripciones, imágenes del local y equipo", () => {
  it.each([
    ["/api/tenant/descripciones", "get"],
    ["/api/tenant/descripciones", "post"],
    ["/api/tenant/descripciones/reorder", "patch"],
    ["/api/tenant/descripciones/{id}", "patch"],
    ["/api/tenant/descripciones/{id}", "delete"],
    ["/api/tenant/imagenes-local", "get"],
    ["/api/tenant/imagenes-local", "post"],
    ["/api/tenant/imagenes-local/reorder", "patch"],
    ["/api/tenant/imagenes-local/{id}", "delete"],
    ["/api/tenant/equipo", "get"],
    ["/api/tenant/equipo", "post"],
    ["/api/tenant/equipo/reorder", "patch"],
    ["/api/tenant/equipo/{id}", "patch"],
    ["/api/tenant/equipo/{id}", "delete"],
  ])("%s %s existe", (path, method) => {
    get(path, method)
  })

  it.each([
    ["/api/tenant/descripciones", ["contenido", "createdAt", "id", "orden"]],
    ["/api/tenant/imagenes-local", ["createdAt", "descripcion", "id", "orden", "url"]],
    ["/api/tenant/equipo", ["cargo", "createdAt", "domicilio", "fotoUrl", "id", "nombre", "orden", "telefono"]],
  ])("GET %s es paginado con los campos del frontend", (path, campos) => {
    const o = get(path, "get")
    expect(propiedadesRespuesta(o)).toEqual(FORMA_PAGINADA)
    expect(propiedadesItem(o)).toEqual(campos)
  })

  it("los body de creación usan los nombres del frontend", () => {
    expect(bodyProps(get("/api/tenant/descripciones", "post"))).toEqual(["contenido"])
    expect(bodyProps(get("/api/tenant/imagenes-local", "post"))).toEqual(["descripcion", "url"])
    expect(bodyProps(get("/api/tenant/equipo", "post"))).toEqual(["cargo", "domicilio", "fotoUrl", "nombre", "telefono"])
    expect(bodyProps(get("/api/tenant/equipo/reorder", "patch"))).toEqual(["ids"])
  })

  it.each(["descripciones", "imagenes-local", "equipo"])(
    "PATCH /%s/reorder se registra antes que /{id}, para que Hono no lo tome como un id",
    (recurso) => {
      const rutas = crearAppCompleta().routes.filter((r) => r.method === "PATCH")
      const reorder = rutas.findIndex((r) => r.path === `/api/tenant/${recurso}/reorder`)
      const porId = rutas.findIndex((r) => r.path === `/api/tenant/${recurso}/:id`)
      expect(reorder).toBeGreaterThanOrEqual(0)
      if (porId >= 0) expect(reorder).toBeLessThan(porId)
    },
  )
})

describe("US3 — localizaciones", () => {
  it.each([
    ["/api/tenant/localizaciones", "get"],
    ["/api/tenant/localizaciones", "post"],
    ["/api/tenant/localizaciones/{id}", "patch"],
    ["/api/tenant/localizaciones/{id}", "delete"],
  ])("%s %s existe", (path, method) => {
    get(path, method)
  })

  it("campos del frontend en el body y en la lista", () => {
    expect(bodyProps(get("/api/tenant/localizaciones", "post"))).toEqual(["barrio", "ciudad", "departamento", "direccion", "latitud", "longitud"])
    expect(propiedadesItem(get("/api/tenant/localizaciones", "get"))).toEqual(
      ["barrio", "ciudad", "createdAt", "departamento", "direccion", "id", "latitud", "longitud"],
    )
  })
})

describe("US4 — propietario (Q1: uno por negocio)", () => {
  it("existen consultar y editar", () => {
    get("/api/tenant/propietarios", "get")
    expect(bodyProps(get("/api/tenant/propietarios/{id}", "patch"))).toEqual(
      ["domicilio", "nombre", "referenciaNombre", "referenciaTelefono", "telefono"],
    )
  })

  it("no existen alta ni baja", () => {
    expect(op("/api/tenant/propietarios", "post")).toBeUndefined()
    expect(op("/api/tenant/propietarios/{id}", "delete")).toBeUndefined()
  })
})

describe("US5 — capacidades", () => {
  it("GET /capabilities existe", () => {
    get("/api/tenant/capabilities", "get")
  })

  it("PATCH /capabilities/{tipo} declara tipo como enum y body { activa }", () => {
    const o = get("/api/tenant/capabilities/{tipo}", "patch")
    const tipo = (o.parameters ?? []).find((p) => p.in === "path" && p.name === "tipo")
    expect(tipo?.schema?.enum?.sort()).toEqual(["consultorio", "restaurante", "tienda"])
    expect(bodyProps(o)).toEqual(["activa"])
  })
})

describe("026 — infraestructura del contrato", () => {
  it("la app completa publica las rutas de /api/tenant", () => {
    expect(paths["/api/tenant/upload-url"]).toBeDefined()
    expect(paths["/api/tenant/miembros"]).toBeDefined()
  })
})
