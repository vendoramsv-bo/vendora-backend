import { describe, it, expect, vi } from "vitest"
import { EliminarProductoUseCase } from "../../../../src/modules/catalogo/application/producto/eliminar-producto.usecase.js"
import { ProductoNoEncontrado } from "../../../../src/modules/catalogo/domain/catalogo.errors.js"
import type { IProductoRepository } from "../../../../src/modules/catalogo/domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../../../src/modules/catalogo/domain/ports/ICatalogoNotificador.js"

function makeProducto(overrides = {}) {
  return { id: "prod1", nombre: "Test", tipoProducto: "COMERCIALIZACION", toJSON: () => ({}), ...overrides }
}

function makeRepo(overrides: Partial<IProductoRepository> = {}): IProductoRepository {
  return {
    obtener: vi.fn(),
    eliminarMovimientoCreacion: vi.fn().mockResolvedValue(undefined),
    eliminar: vi.fn().mockResolvedValue(undefined),
    verificarCodigo: vi.fn(),
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    listarPrecioHistorico: vi.fn(),
    registrarMovimientoCreacion: vi.fn(),
    actualizarMovimientoCreacion: vi.fn(),
    tieneMovimientosReales: vi.fn(),
    listarAtributos: vi.fn(),
    crearAtributo: vi.fn(),
    agregarValorAtributo: vi.fn(),
    eliminarValorAtributo: vi.fn(),
    listarVariantes: vi.fn(),
    crearVariante: vi.fn(),
    actualizarVariante: vi.fn(),
    cambiarEstadoVariante: vi.fn(),
    generarPropuestaVariantes: vi.fn(),
    confirmarVariantes: vi.fn(),
    crearPrecioVolumen: vi.fn(),
    eliminarPrecioVolumen: vi.fn(),
    listarOpciones: vi.fn(),
    crearOpcion: vi.fn(),
    actualizarOpcion: vi.fn(),
    listarOfertas: vi.fn(),
    crearOferta: vi.fn(),
    actualizarOferta: vi.fn(),
    altaMasiva: vi.fn(),
    ...overrides,
  } as unknown as IProductoRepository
}

function makeNotificador(): ICatalogoNotificador {
  return {
    actividadCreada: vi.fn(),
    categoriaCreada: vi.fn(),
    categoriaActualizada: vi.fn(),
    productoCreado: vi.fn(),
    productoActualizado: vi.fn(),
    productoEstadoCambiado: vi.fn(),
    productoEliminado: vi.fn(),
    ofertaCreada: vi.fn(),
    ofertaActualizada: vi.fn(),
    variantesGeneradas: vi.fn(),
    altaMasivaCompletada: vi.fn(),
  }
}

describe("EliminarProductoUseCase", () => {
  it("elimina el movimiento CREACION y luego el producto", async () => {
    const producto = makeProducto()
    const repo = makeRepo({ obtener: vi.fn().mockResolvedValue(producto) })
    const notificador = makeNotificador()

    await new EliminarProductoUseCase(repo, notificador).ejecutar("prod1", "tenant1", "user1")

    expect(repo.eliminarMovimientoCreacion).toHaveBeenCalledWith("prod1", "tenant1")
    expect(repo.eliminar).toHaveBeenCalledWith("prod1", "tenant1")
    const order = vi.mocked(repo.eliminarMovimientoCreacion).mock.invocationCallOrder[0]
    const orderEliminar = vi.mocked(repo.eliminar).mock.invocationCallOrder[0]
    expect(order).toBeLessThan(orderEliminar)
  })

  it("emite evento productoEliminado con nombre del producto", async () => {
    const producto = makeProducto({ nombre: "Producto Test" })
    const repo = makeRepo({ obtener: vi.fn().mockResolvedValue(producto) })
    const notificador = makeNotificador()

    await new EliminarProductoUseCase(repo, notificador).ejecutar("prod1", "tenant1", "user1")

    expect(notificador.productoEliminado).toHaveBeenCalledWith("tenant1", {
      tenantId: "tenant1",
      productoId: "prod1",
      nombre: "Producto Test",
    })
  })

  it("lanza ProductoNoEncontrado cuando el producto no existe", async () => {
    const repo = makeRepo({ obtener: vi.fn().mockResolvedValue(null) })
    const notificador = makeNotificador()

    await expect(new EliminarProductoUseCase(repo, notificador).ejecutar("no-existe", "tenant1", "user1")).rejects.toThrow(
      ProductoNoEncontrado,
    )
    expect(repo.eliminar).not.toHaveBeenCalled()
  })
})
