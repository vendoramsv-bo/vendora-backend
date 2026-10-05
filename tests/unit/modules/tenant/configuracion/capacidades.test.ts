import { describe, it, expect, beforeEach } from "vitest"
import { validarDesactivacion, type TipoVertical } from "../../../../../src/modules/tenant/domain/capacidades.js"
import type { IActivadorVertical } from "../../../../../src/modules/tenant/domain/ports/IActivadorVertical.js"
import {
  ObtenerCapacidadesUseCase,
  CambiarCapacidadUseCase,
} from "../../../../../src/modules/tenant/application/configuracion/capacidades.usecases.js"
import { UltimaVerticalError } from "../../../../../src/modules/tenant/domain/tenant.errors.js"

describe("validarDesactivacion", () => {
  it("no se puede desactivar la única activa", () => {
    expect(() => validarDesactivacion(["tienda"], "tienda")).toThrow(UltimaVerticalError)
  })

  it("con dos activas, sí", () => {
    expect(() => validarDesactivacion(["tienda", "restaurante"], "tienda")).not.toThrow()
  })
})

class FakeActivador implements IActivadorVertical {
  llamadas: string[] = []
  constructor(private readonly tipo: TipoVertical, private readonly estado: { activas: TipoVertical[] }) {}
  async activar() {
    this.llamadas.push("activar")
    this.estado.activas.push(this.tipo)
  }
  async desactivar() {
    this.llamadas.push("desactivar")
    this.estado.activas = this.estado.activas.filter((t) => t !== this.tipo)
  }
}

let estado: { activas: TipoVertical[] }
let activadores: Partial<Record<TipoVertical, FakeActivador>>
const lector = { verticalesActivas: async () => [...estado.activas] }
const obtener = (t: TipoVertical) => activadores[t] ?? null

beforeEach(() => {
  estado = { activas: ["tienda"] }
  activadores = {
    tienda: new FakeActivador("tienda", estado),
    restaurante: new FakeActivador("restaurante", estado),
  }
})

describe("ObtenerCapacidadesUseCase", () => {
  it("devuelve siempre las tres verticales", async () => {
    expect(await new ObtenerCapacidadesUseCase(lector).ejecutar("t")).toEqual({
      data: [
        { tipo: "tienda", activa: true },
        { tipo: "consultorio", activa: false },
        { tipo: "restaurante", activa: false },
      ],
    })
  })
})

describe("CambiarCapacidadUseCase", () => {
  const cambiar = (tipo: TipoVertical, activa: boolean) =>
    new CambiarCapacidadUseCase(lector, obtener).ejecutar({ tenantId: "t", actorUserId: "u", tipo, activa })

  it("delega en el activador de esa vertical", async () => {
    expect(await cambiar("restaurante", true)).toEqual({ tipo: "restaurante", activa: true })
    expect(activadores.restaurante!.llamadas).toEqual(["activar"])
    expect(activadores.tienda!.llamadas).toEqual([])
  })

  it("es idempotente y no llama al activador", async () => {
    await cambiar("tienda", true)
    await cambiar("restaurante", false)
    expect(activadores.tienda!.llamadas).toEqual([])
    expect(activadores.restaurante!.llamadas).toEqual([])
  })

  it("no desactiva la última", async () => {
    await expect(cambiar("tienda", false)).rejects.toThrow(UltimaVerticalError)
    expect(activadores.tienda!.llamadas).toEqual([])
  })

  it("una vertical sin activador registrado da un error claro", async () => {
    await expect(cambiar("consultorio", true)).rejects.toThrow(/consultorio/)
  })
})
