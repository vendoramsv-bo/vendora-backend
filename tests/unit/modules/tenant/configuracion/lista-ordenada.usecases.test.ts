import { describe, it, expect, beforeEach } from "vitest"
import type { IListaOrdenadaRepository } from "../../../../../src/modules/tenant/domain/ports/IListaOrdenadaRepository.js"
import {
  CrearElementoUseCase,
  EditarElementoUseCase,
  BorrarElementoUseCase,
  ReordenarElementosUseCase,
  ListarElementosUseCase,
} from "../../../../../src/modules/tenant/application/configuracion/lista-ordenada.usecases.js"
import {
  LimiteListaAlcanzadoError,
  OrdenDesactualizadoError,
  RecursoConfiguracionNoEncontrado,
} from "../../../../../src/modules/tenant/domain/tenant.errors.js"
import { LIMITE_LISTA } from "../../../../../src/modules/tenant/domain/lista-ordenada.js"

type Item = { id: string; texto: string; orden: number; tenantId: string }

class FakeLista implements IListaOrdenadaRepository<Item, { texto: string }, { texto?: string }> {
  items: Item[] = []
  ordenAplicado: string[] | null = null

  private del(t: string) {
    return this.items.filter((i) => i.tenantId === t).sort((a, b) => a.orden - b.orden)
  }
  async listar(t: string, p: { take: number; skip: number }) {
    const todos = this.del(t)
    return { data: todos.slice(p.skip, p.skip + p.take), total: todos.length }
  }
  async buscar(t: string, id: string) {
    return this.items.find((i) => i.tenantId === t && i.id === id) ?? null
  }
  async contar(t: string) {
    return this.del(t).length
  }
  async maxOrden(t: string) {
    return Math.max(-1, ...this.del(t).map((i) => i.orden))
  }
  async crear(t: string, d: { texto: string }, orden: number) {
    const it = { id: `i${this.items.length + 1}`, tenantId: t, texto: d.texto, orden }
    this.items.push(it)
    return it
  }
  async editar(t: string, id: string, d: { texto?: string }) {
    const it = this.items.find((i) => i.tenantId === t && i.id === id)!
    Object.assign(it, d)
    return it
  }
  async borrar(t: string, id: string) {
    this.items = this.items.filter((i) => !(i.tenantId === t && i.id === id))
  }
  async idsActuales(t: string) {
    return this.del(t).map((i) => i.id)
  }
  async aplicarOrden(t: string, ids: string[]) {
    this.ordenAplicado = ids
    ids.forEach((id, n) => {
      this.items.find((i) => i.tenantId === t && i.id === id)!.orden = n
    })
  }
}

const T = "tenant-a"
let repo: FakeLista

beforeEach(() => {
  repo = new FakeLista()
})

describe("CrearElementoUseCase", () => {
  it("agrega al final (orden = max + 1)", async () => {
    const a = await new CrearElementoUseCase(repo).ejecutar(T, { texto: "a" })
    const b = await new CrearElementoUseCase(repo).ejecutar(T, { texto: "b" })
    expect([a.orden, b.orden]).toEqual([0, 1])
  })

  it(`el elemento ${LIMITE_LISTA + 1} → LimiteListaAlcanzadoError`, async () => {
    repo.items = Array.from({ length: LIMITE_LISTA }, (_, n) => ({ id: `x${n}`, tenantId: T, texto: "", orden: n }))
    await expect(new CrearElementoUseCase(repo).ejecutar(T, { texto: "uno más" })).rejects.toThrow(LimiteListaAlcanzadoError)
  })

  it("el límite es por negocio", async () => {
    repo.items = Array.from({ length: LIMITE_LISTA }, (_, n) => ({ id: `x${n}`, tenantId: "otro", texto: "", orden: n }))
    await expect(new CrearElementoUseCase(repo).ejecutar(T, { texto: "ok" })).resolves.toBeDefined()
  })
})

describe("EditarElementoUseCase", () => {
  it("no cambia el orden", async () => {
    await new CrearElementoUseCase(repo).ejecutar(T, { texto: "a" })
    const b = await new CrearElementoUseCase(repo).ejecutar(T, { texto: "b" })
    const e = await new EditarElementoUseCase(repo).ejecutar(T, b.id, { texto: "b2" })
    expect(e).toMatchObject({ texto: "b2", orden: 1 })
  })

  it("un id inexistente o de otro negocio → no encontrado", async () => {
    const a = await new CrearElementoUseCase(repo).ejecutar(T, { texto: "a" })
    await expect(new EditarElementoUseCase(repo).ejecutar("otro", a.id, { texto: "x" })).rejects.toThrow(RecursoConfiguracionNoEncontrado)
    await expect(new EditarElementoUseCase(repo).ejecutar(T, "nope", { texto: "x" })).rejects.toThrow(RecursoConfiguracionNoEncontrado)
  })
})

describe("BorrarElementoUseCase", () => {
  it("borra, y un id ajeno → no encontrado", async () => {
    const a = await new CrearElementoUseCase(repo).ejecutar(T, { texto: "a" })
    await expect(new BorrarElementoUseCase(repo).ejecutar("otro", a.id)).rejects.toThrow(RecursoConfiguracionNoEncontrado)
    await new BorrarElementoUseCase(repo).ejecutar(T, a.id)
    expect(repo.items).toHaveLength(0)
  })
})

describe("ReordenarElementosUseCase", () => {
  it("aplica el orden y devuelve la lista completa reordenada", async () => {
    const a = await new CrearElementoUseCase(repo).ejecutar(T, { texto: "a" })
    const b = await new CrearElementoUseCase(repo).ejecutar(T, { texto: "b" })
    const r = await new ReordenarElementosUseCase(repo).ejecutar(T, [b.id, a.id])
    expect(r.data.map((i) => i.texto)).toEqual(["b", "a"])
    expect(r.total).toBe(2)
  })

  it("un orden inválido no toca nada", async () => {
    const a = await new CrearElementoUseCase(repo).ejecutar(T, { texto: "a" })
    await new CrearElementoUseCase(repo).ejecutar(T, { texto: "b" })
    await expect(new ReordenarElementosUseCase(repo).ejecutar(T, [a.id])).rejects.toThrow(OrdenDesactualizadoError)
    expect(repo.ordenAplicado).toBeNull()
  })
})

describe("ListarElementosUseCase", () => {
  it("devuelve la forma de paginate(); vacío no es error", async () => {
    const r = await new ListarElementosUseCase(repo).ejecutar(T, { take: 100, skip: 0 })
    expect(r).toMatchObject({ data: [], total: 0, hayPaginaSiguiente: false })
  })
})
