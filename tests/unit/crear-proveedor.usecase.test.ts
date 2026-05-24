import { describe, it, expect, beforeEach } from "vitest"
import { CrearProveedorUseCase } from "../../src/modules/ventas/application/proveedor/crear-proveedor.usecase.js"
import { EliminarProveedorUseCase } from "../../src/modules/ventas/application/proveedor/eliminar-proveedor.usecase.js"
import { FakeProveedorRepository } from "../helpers/fake-proveedor.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import {
  ProveedorNombreDuplicadoError,
  ProveedorNITDuplicadoError,
  ProveedorEnUsoError,
} from "../../src/modules/ventas/domain/ventas.errors.js"

const TENANT = "t1"

const baseProveedor = {
  id: "prov-1",
  tenantId: TENANT,
  claProveedorId: null,
  nombre: "Distribuidora ABC",
  nit: "900123456-1",
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

describe("CrearProveedorUseCase", () => {
  let repo: FakeProveedorRepository
  let notificador: FakeVentasNotificador
  let useCase: CrearProveedorUseCase

  beforeEach(() => {
    repo = new FakeProveedorRepository()
    notificador = new FakeVentasNotificador()
    useCase = new CrearProveedorUseCase(repo, notificador)
  })

  it("crea un proveedor nuevo en estado ACTIVO", async () => {
    const result = await useCase.execute({ tenantId: TENANT, nombre: "Distribuidora ABC", nit: "900123456-1" })
    expect(result.id).toBeDefined()
    expect(result.nombre).toBe("Distribuidora ABC")
    expect(result.estado).toBe("ACTIVO")
  })

  it("emite evento proveedorCreado", async () => {
    await useCase.execute({ tenantId: TENANT, nombre: "Proveedor X" })
    expect(notificador.events).toHaveLength(1)
    expect(notificador.events[0].event).toBe("proveedorCreado")
  })

  it("lanza ProveedorNombreDuplicadoError si el nombre ya existe en el tenant", async () => {
    repo.seed(baseProveedor)
    await expect(
      useCase.execute({ tenantId: TENANT, nombre: "Distribuidora ABC" })
    ).rejects.toThrow(ProveedorNombreDuplicadoError)
  })

  it("lanza ProveedorNITDuplicadoError si el NIT ya existe en el tenant", async () => {
    repo.seed(baseProveedor)
    await expect(
      useCase.execute({ tenantId: TENANT, nombre: "Otro Proveedor", nit: "900123456-1" })
    ).rejects.toThrow(ProveedorNITDuplicadoError)
  })

  it("permite mismo nombre en distinto tenant", async () => {
    repo.seed({ ...baseProveedor, tenantId: "t2" })
    await expect(
      useCase.execute({ tenantId: TENANT, nombre: "Distribuidora ABC" })
    ).resolves.toBeDefined()
  })
})

describe("EliminarProveedorUseCase", () => {
  let repo: FakeProveedorRepository
  let useCase: EliminarProveedorUseCase

  beforeEach(() => {
    repo = new FakeProveedorRepository()
    useCase = new EliminarProveedorUseCase(repo)
  })

  it("elimina un proveedor sin compras", async () => {
    repo.seed(baseProveedor)
    await expect(useCase.execute("prov-1", TENANT)).resolves.toBeUndefined()
  })

  it("lanza ProveedorEnUsoError si el proveedor tiene compras", async () => {
    repo.seed(baseProveedor, 2)
    await expect(useCase.execute("prov-1", TENANT)).rejects.toThrow(ProveedorEnUsoError)
  })
})
