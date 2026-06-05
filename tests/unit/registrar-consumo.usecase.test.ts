import { describe, it, expect, beforeEach } from "vitest"
import { RegistrarConsumoUseCase } from "../../src/modules/almacen/application/receta/registrar-consumo.usecase.js"
import { FakeRecetaProductoRepository } from "../helpers/fake-receta-producto.repository.js"
import { FakeInsumoRepository } from "../helpers/fake-insumo.repository.js"
import { FakeAlmacenNotificador } from "../helpers/fake-almacen-notificador.js"
import type { ISalidaAlmacenRepository } from "../../src/modules/almacen/domain/ports/ISalidaAlmacenRepository.js"
import { InsumoNoEncontradoError } from "../../src/modules/almacen/domain/almacen.errors.js"

const TENANT = "t1"

function makeInsumo(id: string, stock: number, minimo = 5) {
  return {
    id,
    tenantId: TENANT,
    nombre: `Insumo ${id}`,
    unidadMedidaId: "um-1",
    cantidadStock: stock,
    stockMinimo: minimo,
    costoUnitario: 10,
    fechaVencimiento: null,
    estado: "ACTIVO",
    createdAt: new Date(),
  }
}

function makeFakeSalidaRepo(stockDespuesMap: Record<string, number> = {}): ISalidaAlmacenRepository {
  return {
    create: async (_dto) => ({
      salidaId: "salida-1",
      estado: "PENDIENTE",
      version: 0,
      detalles: [],
    }),
    obtenerSalida: async () => null,
    actualizarSalida: async () => { throw new Error("not implemented") },
    aprobarSalida: async (dto) => ({
      salidaId: dto.salidaId,
      estado: "APROBADO",
      version: dto.version + 1,
      detalles: Object.entries(stockDespuesMap).map(([insumoId, stockDespues]) => ({
        insumoId,
        insumoNombre: `Insumo ${insumoId}`,
        cantidad: 1,
        stockAntes: stockDespues + 2,
        stockDespues,
        stockMinimo: 5,
      })),
    }),
    findById: async () => null,
    listar: async () => ({ data: [], total: 0 }),
  }
}

describe("RegistrarConsumoUseCase", () => {
  let recetaRepo: FakeRecetaProductoRepository
  let insumoRepo: FakeInsumoRepository
  let notif: FakeAlmacenNotificador

  beforeEach(async () => {
    recetaRepo = new FakeRecetaProductoRepository()
    insumoRepo = new FakeInsumoRepository()
    notif = new FakeAlmacenNotificador()

    // Define receta: producto p1 → 2 unidades de ins-1 + 0.5 unidades de ins-2
    await recetaRepo.upsert({
      productoId: "p1",
      varianteId: null,
      lineas: [
        { insumoId: "ins-1", cantidad: 2 },
        { insumoId: "ins-2", cantidad: 0.5 },
      ],
    })
  })

  it("registra la salida de insumos al consumir un producto", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 50))
    insumoRepo.seed(makeInsumo("ins-2", 20))
    const salidaRepo = makeFakeSalidaRepo({ "ins-1": 46, "ins-2": 19.5 })
    const useCase = new RegistrarConsumoUseCase(recetaRepo, salidaRepo, insumoRepo, notif)

    const result = await useCase.execute({ tenantId: TENANT, productoId: "p1", cantidad: 2 })

    expect(result.salidaId).toBe("salida-1")
    expect(result.detalles).toHaveLength(2)
  })

  it("retorna resultado vacío si el producto no tiene receta", async () => {
    const salidaRepo = makeFakeSalidaRepo()
    const useCase = new RegistrarConsumoUseCase(recetaRepo, salidaRepo, insumoRepo, notif)

    const result = await useCase.execute({ tenantId: TENANT, productoId: "sin-receta", cantidad: 1 })

    expect(result.salidaId).toBeNull()
  })

  it("lanza InsumoNoEncontradoError si un insumo de la receta no existe", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 50))
    // ins-2 no está en el repo
    const salidaRepo = makeFakeSalidaRepo()
    const useCase = new RegistrarConsumoUseCase(recetaRepo, salidaRepo, insumoRepo, notif)

    await expect(
      useCase.execute({ tenantId: TENANT, productoId: "p1", cantidad: 1 })
    ).rejects.toThrow(InsumoNoEncontradoError)
  })

  it("emite insumoStockCritico cuando el consumo baja el stock por debajo del mínimo", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 6, 5))
    insumoRepo.seed(makeInsumo("ins-2", 20, 5))
    // aprobarSalida devuelve stockDespues=4 para ins-1 (por debajo de mínimo 5)
    const salidaRepo = makeFakeSalidaRepo({ "ins-1": 4, "ins-2": 19.5 })
    const useCase = new RegistrarConsumoUseCase(recetaRepo, salidaRepo, insumoRepo, notif)

    await useCase.execute({ tenantId: TENANT, productoId: "p1", cantidad: 1 })

    expect(notif.tieneEvento("almacen:insumo:stock:critico")).toBe(true)
  })

  it("no emite eventos cuando el stock sigue por encima del mínimo tras el consumo", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 50, 5))
    insumoRepo.seed(makeInsumo("ins-2", 20, 5))
    // stockDespues bien por encima del mínimo
    const salidaRepo = makeFakeSalidaRepo({ "ins-1": 46, "ins-2": 19.5 })
    const useCase = new RegistrarConsumoUseCase(recetaRepo, salidaRepo, insumoRepo, notif)

    await useCase.execute({ tenantId: TENANT, productoId: "p1", cantidad: 2 })

    expect(notif.tieneEvento("almacen:insumo:stock:critico")).toBe(false)
  })
})
