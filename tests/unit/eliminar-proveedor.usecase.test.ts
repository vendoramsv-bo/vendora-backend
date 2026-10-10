import { describe, it, expect, beforeEach } from "vitest"
import { EliminarProveedorUseCase } from "../../src/modules/ventas/application/proveedor/eliminar-proveedor.usecase.js"
import { FakeProveedorRepository } from "../helpers/fake-proveedor.repository.js"
import { ProveedorEnUsoError, ProveedorNoEncontradoError } from "../../src/modules/ventas/domain/ventas.errors.js"

const TENANT = "t1"

const proveedor = {
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

/**
 * Spec 035 (R-03): un proveedor no se elimina si tiene compras **o** ingresos de almacén.
 * Antes solo se miraban las compras y un proveedor con ingresos daba un error de FK (500).
 */
describe("EliminarProveedorUseCase — documentos asociados", () => {
  let repo: FakeProveedorRepository
  let useCase: EliminarProveedorUseCase

  beforeEach(() => {
    repo = new FakeProveedorRepository()
    useCase = new EliminarProveedorUseCase(repo)
  })

  it("lanza ProveedorNoEncontradoError si no existe", async () => {
    await expect(useCase.execute("nope", TENANT)).rejects.toThrow(ProveedorNoEncontradoError)
  })

  it("no elimina un proveedor con compras", async () => {
    repo.seed(proveedor, { compras: 1 })
    await expect(useCase.execute("prov-1", TENANT)).rejects.toThrow(ProveedorEnUsoError)
    expect(await repo.obtenerPorId("prov-1", TENANT)).not.toBeNull()
  })

  it("no elimina un proveedor con ingresos de almacén", async () => {
    repo.seed(proveedor, { ingresos: 1 })
    await expect(useCase.execute("prov-1", TENANT)).rejects.toThrow(ProveedorEnUsoError)
    expect(await repo.obtenerPorId("prov-1", TENANT)).not.toBeNull()
  })

  it("elimina un proveedor sin documentos", async () => {
    repo.seed(proveedor)
    await useCase.execute("prov-1", TENANT)
    expect(await repo.obtenerPorId("prov-1", TENANT)).toBeNull()
  })
})
