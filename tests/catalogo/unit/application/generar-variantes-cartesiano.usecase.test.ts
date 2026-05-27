import { describe, it, expect, vi } from "vitest"
import { GenerarVariantesCartesianoUseCase } from "../../../../src/modules/catalogo/application/producto/generar-variantes-cartesiano.usecase.js"
import { ProductoNoEncontrado, SinAtributos } from "../../../../src/modules/catalogo/domain/catalogo.errors.js"
import type { IProductoRepository } from "../../../../src/modules/catalogo/domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../../../src/modules/catalogo/domain/ports/ICatalogoNotificador.js"

function makeProducto(overrides = {}) {
  return { id: "prod1", nombre: "Camisa", toJSON: () => ({}), ...overrides }
}

function makeRepo(overrides: Partial<IProductoRepository> = {}): IProductoRepository {
  return {
    obtener: vi.fn().mockResolvedValue(makeProducto()),
    generarPropuestaVariantes: vi.fn(),
    confirmarVariantes: vi.fn(),
    verificarCodigo: vi.fn(),
    listar: vi.fn(),
    crear: vi.fn(),
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

describe("GenerarVariantesCartesianoUseCase — generarPropuesta", () => {
  it("devuelve propuesta del repositorio cuando el producto existe", async () => {
    const propuesta = [
      { etiqueta: "Talla S / Color Rojo", combinacion: [], valoresIds: ["av1", "av3"] },
      { etiqueta: "Talla S / Color Azul", combinacion: [], valoresIds: ["av1", "av4"] },
    ]
    const repo = makeRepo({ generarPropuestaVariantes: vi.fn().mockResolvedValue(propuesta) })
    const uc = new GenerarVariantesCartesianoUseCase(repo, makeNotificador())
    const result = await uc.generarPropuesta("prod1", "tenant1")
    expect(result).toHaveLength(2)
    expect(repo.generarPropuestaVariantes).toHaveBeenCalledWith("prod1", "tenant1")
  })

  it("lanza ProductoNoEncontrado cuando el producto no existe", async () => {
    const repo = makeRepo({ obtener: vi.fn().mockResolvedValue(null) })
    const uc = new GenerarVariantesCartesianoUseCase(repo, makeNotificador())
    await expect(uc.generarPropuesta("no-existe", "tenant1")).rejects.toThrow(ProductoNoEncontrado)
  })

  it("propaga SinAtributos desde el repositorio", async () => {
    const repo = makeRepo({ generarPropuestaVariantes: vi.fn().mockRejectedValue(new SinAtributos()) })
    const uc = new GenerarVariantesCartesianoUseCase(repo, makeNotificador())
    await expect(uc.generarPropuesta("prod1", "tenant1")).rejects.toThrow(SinAtributos)
  })
})

describe("GenerarVariantesCartesianoUseCase — confirmarVariantes", () => {
  it("persiste las variantes confirmadas y emite evento", async () => {
    const variantesCreadas = [{ id: "v1" }, { id: "v2" }]
    const repo = makeRepo({ confirmarVariantes: vi.fn().mockResolvedValue(variantesCreadas) })
    const notificador = makeNotificador()
    const uc = new GenerarVariantesCartesianoUseCase(repo, notificador)

    const variantes = [
      { atributoValorIds: ["av1", "av3"], precio: 25 },
      { atributoValorIds: ["av1", "av4"], precio: 27 },
    ]
    const result = await uc.confirmarVariantes("prod1", variantes, "tenant1")
    expect(result).toHaveLength(2)
    expect(notificador.variantesGeneradas).toHaveBeenCalledWith("tenant1", {
      tenantId: "tenant1",
      productoId: "prod1",
      cantidadVariantes: 2,
    })
  })
})
