import { describe, it, expect, beforeEach } from "vitest"
import { EliminarClienteUseCase } from "../../src/modules/ventas/application/cliente/eliminar-cliente.usecase.js"
import { FakeClienteRepository } from "../helpers/fake-cliente.repository.js"
import { ClienteEnUsoError, ClienteNoEncontradoError } from "../../src/modules/ventas/domain/ventas.errors.js"

const TENANT = "t1"

const cliente = {
  id: "cli-1",
  tenantId: TENANT,
  nombre: "Ana",
  email: null,
  telefono: null,
  direccion: null,
  diaNacimiento: null,
  mesNacimiento: null,
  estado: "ACTIVO",
  createdAt: new Date(),
  updatedAt: null,
  createdById: null,
  updatedById: null,
}

/** Spec 035 (R-04): eliminar un cliente, bloqueado si tiene ventas o reservas. */
describe("EliminarClienteUseCase", () => {
  let repo: FakeClienteRepository
  let useCase: EliminarClienteUseCase

  beforeEach(() => {
    repo = new FakeClienteRepository()
    useCase = new EliminarClienteUseCase(repo)
  })

  it("lanza ClienteNoEncontradoError si no existe", async () => {
    await expect(useCase.execute("nope", TENANT)).rejects.toThrow(ClienteNoEncontradoError)
  })

  it("no lo encuentra si es de otro negocio", async () => {
    repo.seed({ ...cliente, tenantId: "otro" })
    await expect(useCase.execute("cli-1", TENANT)).rejects.toThrow(ClienteNoEncontradoError)
  })

  it("no elimina un cliente con documentos (ventas o reservas)", async () => {
    repo.seed(cliente, { documentos: 2 })
    await expect(useCase.execute("cli-1", TENANT)).rejects.toThrow(ClienteEnUsoError)
    expect(await repo.obtenerPorId("cli-1", TENANT)).not.toBeNull()
  })

  it("elimina un cliente sin documentos", async () => {
    repo.seed(cliente)
    await useCase.execute("cli-1", TENANT)
    expect(await repo.obtenerPorId("cli-1", TENANT)).toBeNull()
  })
})
