import { describe, it, expect, beforeEach } from "vitest"
import { CrearCompraUseCase } from "../../src/modules/ventas/application/compra/crear-compra.usecase.js"
import { FakeCompraRepository } from "../helpers/fake-compra.repository.js"
import { FakeProveedorRepository } from "../helpers/fake-proveedor.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { DetalleVacioError, ProveedorNoEncontradoError } from "../../src/modules/ventas/domain/ventas.errors.js"

const TENANT = "t1"

const baseProveedor = {
  id: "prov-1",
  tenantId: TENANT,
  claProveedorId: null,
  nombre: "Distribuidora ABC",
  nit: null,
  telefono: null,
  direccion: null,
  departamento: null,
  sitioWeb: null,
  productosOfrece: null,
  estado: "ACTIVO",
  createdAt: new Date(),
  updatedAt: null,
  createdById: null,
  updatedById: null,
}

const detalle = {
  productoId: "prod-1",
  varianteId: "var-1",
  cantidad: 10,
  precio: 5000,
  precioEstimadoVenta: 8000,
}

describe("CrearCompraUseCase", () => {
  let compraRepo: FakeCompraRepository
  let proveedorRepo: FakeProveedorRepository
  let notificador: FakeVentasNotificador
  let useCase: CrearCompraUseCase

  beforeEach(() => {
    compraRepo = new FakeCompraRepository()
    proveedorRepo = new FakeProveedorRepository()
    notificador = new FakeVentasNotificador()
    useCase = new CrearCompraUseCase(compraRepo, proveedorRepo, notificador)
    proveedorRepo.seed(baseProveedor)
  })

  it("crea una compra en estado PENDIENTE con totalCantidad y totalCompra calculados", async () => {
    const result = await useCase.execute({
      tenantId: TENANT,
      proveedorId: "prov-1",
      detalles: [detalle],
    })

    expect(result.id).toBeDefined()
    expect(result.estado).toBe("PENDIENTE")
    expect(result.totalCantidad).toBe(10)
    expect(result.totalCompra).toBe(50000)
  })

  it("emite evento compraCreada", async () => {
    await useCase.execute({ tenantId: TENANT, proveedorId: "prov-1", detalles: [detalle] })
    expect(notificador.events[0].event).toBe("compraCreada")
  })

  it("lanza DetalleVacioError si se envía array de detalles vacío", async () => {
    await expect(
      useCase.execute({ tenantId: TENANT, proveedorId: "prov-1", detalles: [] })
    ).rejects.toThrow(DetalleVacioError)
  })

  it("lanza ProveedorNoEncontradoError si el proveedor no existe en el tenant", async () => {
    await expect(
      useCase.execute({ tenantId: TENANT, proveedorId: "no-existe", detalles: [detalle] })
    ).rejects.toThrow(ProveedorNoEncontradoError)
  })
})
