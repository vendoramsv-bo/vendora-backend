import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import {
  ROLES_ABASTECIMIENTO,
  ROLES_ALMACEN,
  ROLES_ATENCION,
  ROLES_CATALOGO_ESCRITURA,
  ROLES_CATALOGO_LECTURA,
  ROLES_PUNTO_VENTA_LECTURA,
} from "../../../src/core/hono-context.js"

/**
 * Fija la tabla de contracts §A.6 de la feature 023 (panel por rol).
 *
 * Dos cosas se verifican, y la segunda importa más que la primera:
 *
 * 1. Que cada conjunto sea el que la tabla dice.
 * 2. Que **ningún rol pierda acceso** respecto del estado anterior. Ampliar un
 *    guard es la clase de cambio que puede abrir de más; achicarlo por
 *    distracción es la que rompe a alguien en producción sin avisar.
 */

const RAIZ = path.resolve(__dirname, "..", "..", "..")
const ANTES = ["PROPIETARIO", "ADMIN"]

describe("A.6 — conjuntos de roles por módulo", () => {
  it("catálogo separa escritura de lectura", () => {
    expect([...ROLES_CATALOGO_ESCRITURA].sort()).toEqual(
      ["ADMIN", "BODEGUERO", "ENCARGADO", "PROPIETARIO"],
    )
    expect([...ROLES_CATALOGO_LECTURA].sort()).toEqual(
      ["ADMIN", "BODEGUERO", "CHEF", "ENCARGADO", "MEDICO", "MESERO", "PROPIETARIO", "RECEPCIONISTA", "VENDEDOR"],
    )
  })

  it("quien puede escribir el catálogo puede leerlo", () => {
    for (const rol of ROLES_CATALOGO_ESCRITURA) {
      expect(ROLES_CATALOGO_LECTURA).toContain(rol)
    }
  })

  it("almacén suma BODEGUERO, ENCARGADO y CHEF", () => {
    expect([...ROLES_ALMACEN].sort()).toEqual(
      ["ADMIN", "BODEGUERO", "CHEF", "ENCARGADO", "PROPIETARIO"],
    )
  })

  it("abastecimiento suma BODEGUERO y ENCARGADO", () => {
    expect([...ROLES_ABASTECIMIENTO].sort()).toEqual(
      ["ADMIN", "BODEGUERO", "ENCARGADO", "PROPIETARIO"],
    )
  })

  it("clientes y gastos suman VENDEDOR, RECEPCIONISTA y ENCARGADO", () => {
    expect([...ROLES_ATENCION].sort()).toEqual(
      ["ADMIN", "ENCARGADO", "PROPIETARIO", "RECEPCIONISTA", "VENDEDOR"],
    )
  })

  it("la lectura de punto de venta y turnos suma además MESERO", () => {
    expect([...ROLES_PUNTO_VENTA_LECTURA].sort()).toEqual(
      ["ADMIN", "ENCARGADO", "MESERO", "PROPIETARIO", "RECEPCIONISTA", "VENDEDOR"],
    )
  })
})

describe("A.6 — dirección del cambio: nadie pierde acceso", () => {
  const CONJUNTOS = {
    ROLES_CATALOGO_ESCRITURA,
    ROLES_CATALOGO_LECTURA,
    ROLES_ALMACEN,
    ROLES_ABASTECIMIENTO,
    ROLES_ATENCION,
    ROLES_PUNTO_VENTA_LECTURA,
  }

  it.each(Object.entries(CONJUNTOS))(
    "%s conserva a PROPIETARIO y ADMIN",
    (_nombre, conjunto) => {
      for (const rol of ANTES) expect(conjunto).toContain(rol)
    },
  )
})

describe("A.6 — los adaptadores usan los conjuntos, no literales", () => {
  const ADAPTADORES: Record<string, string[]> = {
    "src/modules/catalogo/adapters/producto.rest.ts": ["ROLES_CATALOGO_ESCRITURA"],
    "src/modules/catalogo/adapters/categoria.rest.ts": ["ROLES_CATALOGO_ESCRITURA"],
    "src/modules/almacen/adapters/inventario.rest.ts": ["ROLES_ALMACEN"],
    "src/modules/almacen/adapters/almacen-operaciones.rest.ts": ["ROLES_ALMACEN"],
    "src/modules/almacen/adapters/insumo.rest.ts": ["ROLES_ALMACEN"],
    "src/modules/ventas/adapters/compra.rest.ts": ["ROLES_ABASTECIMIENTO"],
    "src/modules/ventas/adapters/proveedor.rest.ts": ["ROLES_ABASTECIMIENTO"],
    "src/modules/ventas/adapters/cliente.rest.ts": ["ROLES_ATENCION"],
    "src/modules/ventas/adapters/gastos.rest.ts": ["ROLES_ATENCION"],
  }

  it.each(Object.entries(ADAPTADORES))(
    "%s no dejó ningún requireRol([\"PROPIETARIO\", \"ADMIN\"]) sin ampliar",
    (rel, esperados) => {
      const fuente = fs.readFileSync(path.join(RAIZ, rel), "utf8")
      expect(fuente).not.toContain('requireRol(["PROPIETARIO", "ADMIN"])')
      for (const constante of esperados) {
        expect(fuente).toContain(`requireRol(${constante})`)
      }
    },
  )

  it("solo los métodos de escritura llevan guard de catálogo", () => {
    // Modo `consulta` del mapa: se cumple porque los GET **no llevan guard de
    // rol**, no porque lleven uno más ancho. Ver el comentario de
    // ROLES_CATALOGO_LECTURA en hono-context.ts.
    const fuente = fs.readFileSync(
      path.join(RAIZ, "src/modules/catalogo/adapters/producto.rest.ts"),
      "utf8",
    )
    const bloques = fuente.split(/method: "/).slice(1)
    for (const bloque of bloques) {
      const metodo = bloque.slice(0, bloque.indexOf('"'))
      const guard = bloque.match(/requireRol\((\w+)\)/)
      if (metodo === "get") {
        const hastaElHandler = bloque.slice(0, bloque.indexOf("responses:"))
        expect(hastaElHandler).not.toContain("requireRol")
      } else if (guard) {
        expect(guard[1]).toBe("ROLES_CATALOGO_ESCRITURA")
      }
    }
  })

  it("la lectura de punto de venta y turnos ya estaba abierta: no se tocó nada", () => {
    // Hallazgo al implementar: contracts §A.6 daba por hecho que el GET de estos
    // dos módulos estaba restringido a P y A. No lo estaba — solo los write
    // llevan `requireRol`. La lectura que hace falta para abrir caja ya
    // funcionaba, así que la ampliación era innecesaria y las escrituras
    // quedan como estaban.
    for (const rel of [
      "src/modules/ventas/adapters/punto-venta.rest.ts",
      "src/modules/ventas/adapters/turno-atencion.rest.ts",
    ]) {
      const fuente = fs.readFileSync(path.join(RAIZ, rel), "utf8")
      const bloques = fuente.split(/method: "/).slice(1)
      for (const bloque of bloques) {
        const metodo = bloque.slice(0, bloque.indexOf('"'))
        if (metodo !== "get") continue
        const hastaElHandler = bloque.slice(0, bloque.indexOf("responses:"))
        expect(hastaElHandler).not.toContain("requireRol")
      }
    }
  })
})
