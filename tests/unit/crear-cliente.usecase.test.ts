import { describe, it, expect, beforeEach } from "vitest"
import { CrearClienteUseCase } from "../../src/modules/ventas/application/cliente/crear-cliente.usecase.js"
import { FakeClienteRepository } from "../helpers/fake-cliente.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { ClienteNombreDuplicadoError, ClienteEmailDuplicadoError } from "../../src/modules/ventas/domain/ventas.errors.js"

const TENANT = "t1"

describe("CrearClienteUseCase", () => {
  let repo: FakeClienteRepository
  let notificador: FakeVentasNotificador
  let useCase: CrearClienteUseCase

  beforeEach(() => {
    repo = new FakeClienteRepository()
    notificador = new FakeVentasNotificador()
    useCase = new CrearClienteUseCase(repo, notificador)
  })

  it("crea un cliente nuevo en estado ACTIVO", async () => {
    const result = await useCase.execute({
      tenantId: TENANT,
      nombre: "María García",
      email: "maria@test.com",
    })

    expect(result.id).toBeDefined()
    expect(result.nombre).toBe("María García")
    expect(result.estado).toBe("ACTIVO")
    expect(result.email).toBe("maria@test.com")
  })

  it("emite evento clienteCreado al notificador", async () => {
    await useCase.execute({ tenantId: TENANT, nombre: "Juan" })

    expect(notificador.events).toHaveLength(1)
    expect(notificador.events[0].event).toBe("clienteCreado")
    expect(notificador.events[0].tenantId).toBe(TENANT)
  })

  it("lanza ClienteNombreDuplicadoError si ya existe el nombre en el tenant", async () => {
    repo.seed({ id: "c1", tenantId: TENANT, nombre: "María García", email: null, telefono: null, direccion: null, diaNacimiento: null, mesNacimiento: null, estado: "ACTIVO", createdAt: new Date(), updatedAt: null, createdById: null, updatedById: null })

    await expect(
      useCase.execute({ tenantId: TENANT, nombre: "María García" })
    ).rejects.toThrow(ClienteNombreDuplicadoError)
  })

  it("lanza ClienteEmailDuplicadoError si ya existe el email en el tenant", async () => {
    repo.seed({ id: "c1", tenantId: TENANT, nombre: "Otro Nombre", email: "maria@test.com", telefono: null, direccion: null, diaNacimiento: null, mesNacimiento: null, estado: "ACTIVO", createdAt: new Date(), updatedAt: null, createdById: null, updatedById: null })

    await expect(
      useCase.execute({ tenantId: TENANT, nombre: "María García", email: "maria@test.com" })
    ).rejects.toThrow(ClienteEmailDuplicadoError)
  })

  it("permite mismo nombre en distinto tenant", async () => {
    repo.seed({ id: "c1", tenantId: "t2", nombre: "María García", email: null, telefono: null, direccion: null, diaNacimiento: null, mesNacimiento: null, estado: "ACTIVO", createdAt: new Date(), updatedAt: null, createdById: null, updatedById: null })

    await expect(
      useCase.execute({ tenantId: TENANT, nombre: "María García" })
    ).resolves.toBeDefined()
  })
})
