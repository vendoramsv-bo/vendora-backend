import { describe, it, expect, beforeEach } from "vitest"
import { FakeMiembrosRepository, FakeNotificadorInvitacion, FakeTenantNotificador } from "./fakes.js"
import { InvitarMiembroUseCase } from "../../../../../src/modules/tenant/application/configuracion/invitar-miembro.usecase.js"
import { CancelarInvitacionUseCase } from "../../../../../src/modules/tenant/application/configuracion/cancelar-invitacion.usecase.js"
import { CambiarRolMiembroUseCase } from "../../../../../src/modules/tenant/application/configuracion/cambiar-rol-miembro.usecase.js"
import { QuitarMiembroUseCase } from "../../../../../src/modules/tenant/application/configuracion/quitar-miembro.usecase.js"
import {
  YaEsMiembroError,
  InvitacionPendienteError,
  RolNoAsignableError,
  RecursoConfiguracionNoEncontrado,
  UnicoPropietarioError,
  SoloPropietarioError,
} from "../../../../../src/modules/tenant/domain/tenant.errors.js"

const T = "tenant-a"

let repo: FakeMiembrosRepository
let correo: FakeNotificadorInvitacion
let notif: FakeTenantNotificador

beforeEach(() => {
  repo = new FakeMiembrosRepository()
  correo = new FakeNotificadorInvitacion()
  notif = new FakeTenantNotificador()
  repo.miembros = [
    { tenantId: T, id: "m-prop", userId: "u-prop", rol: "owner", email: "prop@x.com" },
    { tenantId: T, id: "m-adm", userId: "u-adm", rol: "ADMIN", email: "adm@x.com" },
    { tenantId: T, id: "m-vend", userId: "u-vend", rol: "VENDEDOR", email: "vend@x.com" },
    { tenantId: "tenant-b", id: "m-ajeno", userId: "u-ajeno", rol: "VENDEDOR", email: "ajeno@x.com" },
  ]
})

describe("InvitarMiembroUseCase", () => {
  const invitar = (actorId: string, email: string, rol: string) =>
    new InvitarMiembroUseCase(repo, correo).ejecutar({ tenantId: T, actorUserId: actorId, email, rol })

  it("crea la invitación pendiente a 7 días y envía el correo", async () => {
    const antes = Date.now()
    const inv = await invitar("u-adm", "nuevo@x.com", "VENDEDOR")
    expect(inv.rol).toBe("VENDEDOR")
    const dias = (new Date(inv.expiresAt).getTime() - antes) / 86_400_000
    expect(dias).toBeGreaterThan(6.99)
    expect(dias).toBeLessThan(7.01)
    expect(correo.enviados).toEqual([{ email: "nuevo@x.com", invitacionId: inv.id, nombreNegocio: "Negocio de prueba" }])
  })

  it("normaliza el correo a minúsculas y sin espacios", async () => {
    const inv = await invitar("u-adm", "  Nuevo@X.com ", "VENDEDOR")
    expect(inv.email).toBe("nuevo@x.com")
  })

  it("rechaza a quien ya es miembro", async () => {
    await expect(invitar("u-adm", "vend@x.com", "VENDEDOR")).rejects.toThrow(YaEsMiembroError)
  })

  it("rechaza una segunda invitación pendiente al mismo correo", async () => {
    await invitar("u-adm", "nuevo@x.com", "VENDEDOR")
    await expect(invitar("u-adm", "nuevo@x.com", "VENDEDOR")).rejects.toThrow(InvitacionPendienteError)
  })

  it("rechaza un rol de una vertical inactiva, listando los válidos", async () => {
    const err = await invitar("u-adm", "doc@x.com", "MEDICO").catch((e) => e)
    expect(err).toBeInstanceOf(RolNoAsignableError)
    expect((err as RolNoAsignableError).rolesValidos).toContain("VENDEDOR")
  })

  it("solo un propietario invita como PROPIETARIO", async () => {
    await expect(invitar("u-adm", "socio@x.com", "PROPIETARIO")).rejects.toThrow(SoloPropietarioError)
    await expect(invitar("u-prop", "socio@x.com", "PROPIETARIO")).resolves.toBeDefined()
  })
})

describe("CancelarInvitacionUseCase", () => {
  const crear = () =>
    new InvitarMiembroUseCase(repo, correo).ejecutar({ tenantId: T, actorUserId: "u-adm", email: "n@x.com", rol: "VENDEDOR" })

  it("pasa la invitación a canceled", async () => {
    const inv = await crear()
    await new CancelarInvitacionUseCase(repo).ejecutar(T, inv.id)
    expect(repo.invitaciones[0].status).toBe("canceled")
  })

  it("una invitación de otro negocio o inexistente → no encontrada", async () => {
    const inv = await crear()
    await expect(new CancelarInvitacionUseCase(repo).ejecutar("tenant-b", inv.id)).rejects.toThrow(RecursoConfiguracionNoEncontrado)
    await expect(new CancelarInvitacionUseCase(repo).ejecutar(T, "nope")).rejects.toThrow(RecursoConfiguracionNoEncontrado)
  })
})

describe("CambiarRolMiembroUseCase", () => {
  const cambiar = (actor: string, miembro: string, rol: string) =>
    new CambiarRolMiembroUseCase(repo).ejecutar({ tenantId: T, actorUserId: actor, miembroId: miembro, rol })

  it("cambia el rol", async () => {
    expect((await cambiar("u-adm", "m-vend", "BODEGUERO")).rol).toBe("BODEGUERO")
  })

  it("rol fuera de las verticales activas", async () => {
    await expect(cambiar("u-adm", "m-vend", "CHEF")).rejects.toThrow(RolNoAsignableError)
  })

  it("no se puede bajar al único propietario", async () => {
    await expect(cambiar("u-prop", "m-prop", "ADMIN")).rejects.toThrow(UnicoPropietarioError)
  })

  it("un ADMIN no puede promover a PROPIETARIO", async () => {
    await expect(cambiar("u-adm", "m-vend", "PROPIETARIO")).rejects.toThrow(SoloPropietarioError)
  })

  it("un miembro de otro negocio → no encontrado", async () => {
    await expect(cambiar("u-adm", "m-ajeno", "BODEGUERO")).rejects.toThrow(RecursoConfiguracionNoEncontrado)
  })
})

describe("QuitarMiembroUseCase", () => {
  const quitar = (actor: string, miembro: string) =>
    new QuitarMiembroUseCase(repo, notif).ejecutar({ tenantId: T, actorUserId: actor, miembroId: miembro })

  it("borra el miembro, cierra sus sesiones en ese negocio y notifica", async () => {
    await quitar("u-adm", "m-vend")
    expect(repo.miembros.some((m) => m.id === "m-vend")).toBe(false)
    expect(repo.sesionesCerradas).toEqual([{ tenantId: T, userId: "u-vend" }])
    expect(notif.removidos).toEqual(["u-vend"])
  })

  it("el único propietario no se puede quitar, ni a sí mismo", async () => {
    await expect(quitar("u-prop", "m-prop")).rejects.toThrow(UnicoPropietarioError)
    expect(repo.sesionesCerradas).toEqual([])
  })

  it("un ADMIN puede quitarse a sí mismo", async () => {
    await quitar("u-adm", "m-adm")
    expect(repo.miembros.some((m) => m.id === "m-adm")).toBe(false)
  })

  it("un ADMIN no puede quitar a un propietario", async () => {
    repo.miembros.push({ tenantId: T, id: "m-prop2", userId: "u-prop2", rol: "PROPIETARIO", email: "p2@x.com" })
    await expect(quitar("u-adm", "m-prop2")).rejects.toThrow(SoloPropietarioError)
  })

  it("un miembro de otro negocio → no encontrado", async () => {
    await expect(quitar("u-adm", "m-ajeno")).rejects.toThrow(RecursoConfiguracionNoEncontrado)
  })
})
