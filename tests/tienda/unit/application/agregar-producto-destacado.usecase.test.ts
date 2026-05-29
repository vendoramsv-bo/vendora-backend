import { describe, it, expect, vi } from "vitest"
import { AgregarProductoDestacadoUseCase } from "../../../../src/modules/tienda/application/destacados/agregar-producto-destacado.usecase.js"
import type { ITiendaRepository, DestacadoItemDTO } from "../../../../src/modules/tienda/domain/ports/ITiendaRepository.js"
import type { ITiendaNotificador } from "../../../../src/modules/tienda/domain/ports/ITiendaNotificador.js"
import {
  ProductoDestacadoLimiteError,
  ProductoNoVisibleParaDestacadoError,
  ProductoDestacadoYaExisteError,
} from "../../../../src/modules/tienda/domain/tienda.errors.js"

function makeRepo(agregarResult?: DestacadoItemDTO, errorClass?: new (...args: never[]) => Error): ITiendaRepository {
  return {
    activar: vi.fn(),
    desactivar: vi.fn(),
    obtenerConfiguracion: vi.fn(),
    actualizarConfiguracion: vi.fn(),
    obtenerPerfilPublico: vi.fn(),
    listarDirectorio: vi.fn(),
    agregarDestacado: errorClass
      ? vi.fn().mockRejectedValue(new errorClass())
      : vi.fn().mockResolvedValue(agregarResult ?? { id: "dest-1", productoId: "p-1", nombre: "Producto 1", imagenUrl: null, orden: 0 }),
    quitarDestacado: vi.fn(),
    reordenarDestacados: vi.fn(),
    listarDestacados: vi.fn(),
    listarCatalogoPublico: vi.fn(),
  }
}

function makeNotificador(): ITiendaNotificador {
  return {
    configuracionActualizada: vi.fn(),
    destacadosActualizados: vi.fn(),
    nuevaValoracion: vi.fn(),
    nuevoComentario: vi.fn(),
    nuevaPregunta: vi.fn(),
    nuevoSeguidor: vi.fn(),
  }
}

describe("AgregarProductoDestacadoUseCase", () => {
  it("agrega un producto destacado y emite evento", async () => {
    const repo = makeRepo()
    const notif = makeNotificador()
    const uc = new AgregarProductoDestacadoUseCase(repo, notif)

    const result = await uc.execute("tenant-1", "p-1", 0, "user-1")

    expect(result.productoId).toBe("p-1")
    expect(notif.destacadosActualizados).toHaveBeenCalledWith("tenant-1", expect.any(String))
  })

  it("propaga ProductoDestacadoLimiteError cuando se supera el límite", async () => {
    const repo = makeRepo(undefined, ProductoDestacadoLimiteError as never)
    const uc = new AgregarProductoDestacadoUseCase(repo, null)

    await expect(uc.execute("tenant-1", "p-1")).rejects.toThrow(ProductoDestacadoLimiteError)
  })

  it("propaga ProductoNoVisibleParaDestacadoError si producto inactivo", async () => {
    const repo = makeRepo(undefined, ProductoNoVisibleParaDestacadoError as never)
    const uc = new AgregarProductoDestacadoUseCase(repo, null)

    await expect(uc.execute("tenant-1", "p-inactivo")).rejects.toThrow(ProductoNoVisibleParaDestacadoError)
  })

  it("propaga ProductoDestacadoYaExisteError si duplicado", async () => {
    const repo = makeRepo(undefined, ProductoDestacadoYaExisteError as never)
    const uc = new AgregarProductoDestacadoUseCase(repo, null)

    await expect(uc.execute("tenant-1", "p-dup")).rejects.toThrow(ProductoDestacadoYaExisteError)
  })
})
