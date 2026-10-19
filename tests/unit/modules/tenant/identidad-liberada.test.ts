import { describe, it, expect } from "vitest"
import { identidadLiberada } from "../../../../src/modules/tenant/domain/identidad-liberada.js"

/**
 * Nombre y slug que toma un negocio al darse de baja (frontend spec 038).
 *
 * La baja es lógica: la fila queda para conservar ventas y comprobantes. Pero
 * `name`, `slug` y `nombreLargo` son únicos, así que el propietario no podía crear un negocio
 * nuevo con el mismo nombre ("ORGANIZATION_ALREADY_EXISTS"). Lo que se protege:
 *
 * 1. Los dos valores cambian, y el original queda reconocible al leerlos.
 * 2. El sufijo sale del id: dos bajas del mismo nombre no chocan entre sí.
 */
describe("identidadLiberada", () => {
  const id = "cmabc123xyz98765"

  it("libera el nombre y el slug con un sufijo del id", () => {
    expect(
      identidadLiberada({ id, name: "La Esquina", slug: "la-esquina", nombreLargo: "Almacén La Esquina" }),
    ).toEqual({
      name: "La Esquina (eliminado xyz98765)",
      slug: "la-esquina--eliminado-xyz98765",
      nombreLargo: "Almacén La Esquina (eliminado xyz98765)",
    })
  })

  it("dos negocios con el mismo nombre quedan distintos", () => {
    const datos = { name: "La Esquina", slug: "la-esquina", nombreLargo: "Almacén La Esquina" }
    const a = identidadLiberada({ id: "aaaaaaaa11111111", ...datos })
    const b = identidadLiberada({ id: "bbbbbbbb22222222", ...datos })
    expect(a.name).not.toBe(b.name)
    expect(a.slug).not.toBe(b.slug)
    expect(a.nombreLargo).not.toBe(b.nombreLargo)
  })

  it("el slug liberado sigue siendo un slug válido", () => {
    expect(identidadLiberada({ id, name: "X", slug: "x", nombreLargo: "X" }).slug).toMatch(/^[a-z0-9-]+$/)
  })
})
