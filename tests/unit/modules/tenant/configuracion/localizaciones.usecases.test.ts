import { describe, it, expect, beforeEach } from "vitest"
import type {
  ILocalizacionRepository,
  LocalizacionItem,
  DatosLocalizacion,
} from "../../../../../src/modules/tenant/domain/ports/ILocalizacionRepository.js"
import {
  BorrarLocalizacionUseCase,
  EditarLocalizacionUseCase,
  CrearLocalizacionUseCase,
} from "../../../../../src/modules/tenant/application/configuracion/localizaciones.usecases.js"
import { UltimaLocalizacionError, RecursoConfiguracionNoEncontrado } from "../../../../../src/modules/tenant/domain/tenant.errors.js"

class FakeLocalizaciones implements ILocalizacionRepository {
  items: Array<LocalizacionItem & { tenantId: string }> = []
  async listar(t: string) {
    const d = this.items.filter((i) => i.tenantId === t)
    return { data: d, total: d.length }
  }
  async buscar(t: string, id: string) {
    return this.items.find((i) => i.tenantId === t && i.id === id) ?? null
  }
  async contar(t: string) {
    return this.items.filter((i) => i.tenantId === t).length
  }
  async crear(t: string, d: DatosLocalizacion) {
    const it = { ...d, id: `l${this.items.length + 1}`, tenantId: t, createdAt: new Date().toISOString() }
    this.items.push(it)
    return it
  }
  async editar(t: string, id: string, d: Partial<DatosLocalizacion>) {
    const it = this.items.find((i) => i.tenantId === t && i.id === id)!
    Object.assign(it, d)
    return it
  }
  async borrar(t: string, id: string) {
    this.items = this.items.filter((i) => !(i.tenantId === t && i.id === id))
  }
}

const T = "tenant-a"
const datos: DatosLocalizacion = { latitud: -16.5, longitud: -68.15, direccion: "Av. Arce 123", ciudad: "La Paz", departamento: "La Paz" }
let repo: FakeLocalizaciones

beforeEach(() => {
  repo = new FakeLocalizaciones()
})

describe("localizaciones", () => {
  it("no se puede borrar la única", async () => {
    const l = await new CrearLocalizacionUseCase(repo).ejecutar(T, datos)
    await expect(new BorrarLocalizacionUseCase(repo).ejecutar(T, l.id)).rejects.toThrow(UltimaLocalizacionError)
    expect(repo.items).toHaveLength(1)
  })

  it("con dos, se puede borrar una", async () => {
    const l = await new CrearLocalizacionUseCase(repo).ejecutar(T, datos)
    await new CrearLocalizacionUseCase(repo).ejecutar(T, { ...datos, direccion: "Calle 2" })
    await new BorrarLocalizacionUseCase(repo).ejecutar(T, l.id)
    expect(repo.items).toHaveLength(1)
  })

  it("las de otro negocio no cuentan para 'la única'", async () => {
    await new CrearLocalizacionUseCase(repo).ejecutar("otro", datos)
    const l = await new CrearLocalizacionUseCase(repo).ejecutar(T, datos)
    await expect(new BorrarLocalizacionUseCase(repo).ejecutar(T, l.id)).rejects.toThrow(UltimaLocalizacionError)
  })

  it("editar o borrar una de otro negocio → no encontrada", async () => {
    const ajena = await new CrearLocalizacionUseCase(repo).ejecutar("otro", datos)
    await expect(new EditarLocalizacionUseCase(repo).ejecutar(T, ajena.id, { ciudad: "X" })).rejects.toThrow(RecursoConfiguracionNoEncontrado)
    await expect(new BorrarLocalizacionUseCase(repo).ejecutar(T, ajena.id)).rejects.toThrow(RecursoConfiguracionNoEncontrado)
  })
})
