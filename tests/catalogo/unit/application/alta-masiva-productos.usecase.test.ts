import { describe, it, expect, vi } from "vitest"
import { AltaMasivaProductosUseCase } from "../../../../src/modules/catalogo/application/producto/alta-masiva-productos.usecase.js"
import { AltaMasivaVacia, ClaProductoNoEncontrado } from "../../../../src/modules/catalogo/domain/catalogo.errors.js"
import type { IProductoRepository } from "../../../../src/modules/catalogo/domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../../../src/modules/catalogo/domain/ports/ICatalogoNotificador.js"

function makeRepo(overrides: Partial<IProductoRepository> = {}): IProductoRepository {
  return {
    altaMasiva: vi.fn(),
    verificarCodigo: vi.fn(),
    listar: vi.fn(),
    crear: vi.fn(),
    obtener: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    listarPrecioHistorico: vi.fn(),
    eliminar: vi.fn(),
    registrarMovimientoCreacion: vi.fn(),
    eliminarMovimientoCreacion: vi.fn(),
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

describe("AltaMasivaProductosUseCase", () => {
  it("lanza AltaMasivaVacia cuando la lista está vacía", async () => {
    const repo = makeRepo()
    const uc = new AltaMasivaProductosUseCase(repo, makeNotificador())
    await expect(uc.ejecutar([], "tenant1", "user1")).rejects.toThrow(AltaMasivaVacia)
    expect(repo.altaMasiva).not.toHaveBeenCalled()
  })

  it("llama al repositorio con los IDs y propaga el resultado", async () => {
    const resultado = { creados: [{ id: "p1", toJSON: () => ({}) }, { id: "p2", toJSON: () => ({}) }], categoriasCreadas: 1, unidadesMedidaCreadas: 0 }
    const repo = makeRepo({ altaMasiva: vi.fn().mockResolvedValue(resultado) })
    const notificador = makeNotificador()
    const uc = new AltaMasivaProductosUseCase(repo, notificador)

    const result = await uc.ejecutar(["cla1", "cla2"], "tenant1", "user1")
    expect(repo.altaMasiva).toHaveBeenCalledWith(["cla1", "cla2"], "tenant1", "user1")
    expect(result.creados).toHaveLength(2)
  })

  it("emite altaMasivaCompletada con métricas correctas", async () => {
    const resultado = { creados: [{ id: "p1", toJSON: () => ({}) }], categoriasCreadas: 2, unidadesMedidaCreadas: 1 }
    const repo = makeRepo({ altaMasiva: vi.fn().mockResolvedValue(resultado) })
    const notificador = makeNotificador()
    await new AltaMasivaProductosUseCase(repo, notificador).ejecutar(["cla1"], "tenant1", "user1")

    expect(notificador.altaMasivaCompletada).toHaveBeenCalledWith("tenant1", {
      tenantId: "tenant1",
      productosCreados: 1,
      categoriasCreadas: 2,
      unidadesMedidaCreadas: 1,
    })
  })

  it("propaga ClaProductoNoEncontrado desde el repositorio", async () => {
    const error = new ClaProductoNoEncontrado(["cla-falso"])
    const repo = makeRepo({ altaMasiva: vi.fn().mockRejectedValue(error) })
    const uc = new AltaMasivaProductosUseCase(repo, makeNotificador())
    await expect(uc.ejecutar(["cla1", "cla-falso"], "tenant1", "user1")).rejects.toThrow(ClaProductoNoEncontrado)
  })
})
