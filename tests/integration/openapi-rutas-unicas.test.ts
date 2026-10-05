/**
 * Dos `createRoute` con el mismo método y path no fallan en ningún lado:
 * en runtime Hono ejecuta el router montado primero, y en /api/openapi.json
 * el último registrado pisa al anterior. Así convivieron los recuentos de
 * productos y de insumos en GET/POST /api/almacen/recuentos: el contrato
 * documentaba insumos y el servidor respondía productos.
 *
 * El JSON publicado deduplica los paths, así que el chequeo se hace sobre el
 * registro de definiciones, que conserva cada `createRoute`.
 */
import { describe, it, expect } from "vitest"
import { crearAppCompleta } from "../../src/server/app.js"

describe("OpenAPI — rutas únicas", () => {
  it("ningún método + path está declarado por dos operaciones", () => {
    const app = crearAppCompleta()
    const vistas = new Map<string, string[]>()

    for (const def of app.openAPIRegistry.definitions) {
      if (def.type !== "route") continue
      const clave = `${def.route.method.toUpperCase()} ${def.route.path}`
      vistas.set(clave, [...(vistas.get(clave) ?? []), def.route.operationId ?? "(sin operationId)"])
    }

    const duplicadas = [...vistas].filter(([, ops]) => ops.length > 1).map(([k, ops]) => `${k} → ${ops.join(", ")}`)
    expect(duplicadas).toEqual([])
  })
})
