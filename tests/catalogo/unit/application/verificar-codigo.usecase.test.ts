import { describe, it, expect, vi } from "vitest"
import { VerificarCodigoUseCase } from "../../../../src/modules/catalogo/application/producto/verificar-codigo.usecase.js"
import type { IProductoRepository } from "../../../../src/modules/catalogo/domain/ports/IProductoRepository.js"

function makeRepo(overrides: Partial<IProductoRepository> = {}): IProductoRepository {
  return {
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
    altaMasiva: vi.fn(),
    ...overrides,
  } as unknown as IProductoRepository
}

describe("VerificarCodigoUseCase", () => {
  it("devuelve existe:true cuando el código ya existe", async () => {
    const productoExistente = { id: "p1", nombre: "Test", codigo: "PROD-001" }
    const repo = makeRepo({
      verificarCodigo: vi.fn().mockResolvedValue({ existe: true, producto: productoExistente }),
    })
    const uc = new VerificarCodigoUseCase(repo)
    const result = await uc.ejecutar("tenant1", "PROD-001")
    expect(result.existe).toBe(true)
    expect(result.producto).toEqual(productoExistente)
    expect(repo.verificarCodigo).toHaveBeenCalledWith("tenant1", "PROD-001")
  })

  it("devuelve existe:false cuando el código no existe", async () => {
    const repo = makeRepo({
      verificarCodigo: vi.fn().mockResolvedValue({ existe: false }),
    })
    const uc = new VerificarCodigoUseCase(repo)
    const result = await uc.ejecutar("tenant1", "NO-EXISTE")
    expect(result.existe).toBe(false)
    expect(result.producto).toBeUndefined()
  })

  it("pasa el tenantId y código al repositorio", async () => {
    const repo = makeRepo({
      verificarCodigo: vi.fn().mockResolvedValue({ existe: false }),
    })
    const uc = new VerificarCodigoUseCase(repo)
    await uc.ejecutar("mi-tenant", "  CODIGO-CON-ESPACIOS  ")
    expect(repo.verificarCodigo).toHaveBeenCalledWith("mi-tenant", "  CODIGO-CON-ESPACIOS  ")
  })
})
