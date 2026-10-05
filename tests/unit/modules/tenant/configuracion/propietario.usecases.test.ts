import { describe, it, expect, beforeEach } from "vitest"
import type {
  IPropietarioRepository,
  PropietarioItem,
  DatosPropietario,
} from "../../../../../src/modules/tenant/domain/ports/IPropietarioRepository.js"
import {
  ObtenerPropietarioUseCase,
  EditarPropietarioUseCase,
} from "../../../../../src/modules/tenant/application/configuracion/propietario.usecases.js"
import { RecursoConfiguracionNoEncontrado } from "../../../../../src/modules/tenant/domain/tenant.errors.js"

class FakePropietarios implements IPropietarioRepository {
  items: Array<PropietarioItem & { tenantId: string }> = []
  async delNegocio(t: string) {
    return this.items.find((i) => i.tenantId === t) ?? null
  }
  async editar(t: string, id: string, d: Partial<DatosPropietario>, _actor: string) {
    const it = this.items.find((i) => i.tenantId === t && i.id === id)!
    Object.assign(it, d)
    return it
  }
}

let repo: FakePropietarios

beforeEach(() => {
  repo = new FakePropietarios()
  repo.items = [
    { tenantId: "a", id: "p-a", nombre: "Ana", telefono: "7000000", domicilio: "Calle 1", createdAt: "2026-01-01T00:00:00.000Z" },
    { tenantId: "b", id: "p-b", nombre: "Beto", telefono: "7111111", createdAt: "2026-01-01T00:00:00.000Z" },
  ]
})

describe("propietario", () => {
  it("obtener devuelve una lista de exactamente uno", async () => {
    const r = await new ObtenerPropietarioUseCase(repo).ejecutar("a")
    expect(r.data.map((p) => p.id)).toEqual(["p-a"])
    expect(r.total).toBe(1)
  })

  it("un negocio sin propietario devuelve lista vacía, no error", async () => {
    const r = await new ObtenerPropietarioUseCase(repo).ejecutar("sin-prop")
    expect(r).toMatchObject({ data: [], total: 0 })
  })

  it("editar parcial conserva lo no enviado", async () => {
    const p = await new EditarPropietarioUseCase(repo).ejecutar("a", "p-a", { telefono: "7222222" }, "u1")
    expect(p).toMatchObject({ nombre: "Ana", telefono: "7222222", domicilio: "Calle 1" })
  })

  it("editar el propietario de otro negocio → no encontrado", async () => {
    await expect(new EditarPropietarioUseCase(repo).ejecutar("a", "p-b", { nombre: "X" }, "u1")).rejects.toThrow(
      RecursoConfiguracionNoEncontrado,
    )
  })
})
