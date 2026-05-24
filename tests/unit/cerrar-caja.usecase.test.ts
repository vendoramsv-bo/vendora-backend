import { describe, it, expect, beforeEach } from "vitest"
import { CerrarCajaUseCase } from "../../src/modules/ventas/application/caja/cerrar-caja.usecase.js"
import { FakeCajaRepository } from "../helpers/fake-caja.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { CajaYaCerradaError } from "../../src/modules/ventas/domain/ventas.errors.js"
import type { CajaAbiertaData } from "../../src/modules/ventas/domain/ports/ICajaRepository.js"

const TENANT = "t1"

const baseCaja: CajaAbiertaData = {
  id: "caja-1",
  tenantId: TENANT,
  puntoVentaId: "pv-1",
  turnoId: "turno-1",
  tenantMemberId: "member-1",
  fecha: new Date(),
  montoIngresos: 500,
  montoEgresos: 0,
  montoVentas: 0,
  montoDescuentos: 0,
  montoArqueoCaja: 0,
  estadoCaja: "APERTURADA",
  createdById: null,
  updatedById: null,
  createdAt: new Date(),
  updatedAt: null,
}

describe("CerrarCajaUseCase", () => {
  let cajaRepo: FakeCajaRepository
  let notificador: FakeVentasNotificador
  let useCase: CerrarCajaUseCase

  beforeEach(() => {
    cajaRepo = new FakeCajaRepository()
    notificador = new FakeVentasNotificador()
    useCase = new CerrarCajaUseCase(cajaRepo, notificador)
    cajaRepo.cajas.push({ ...baseCaja })
  })

  it("cierra la caja con estado CERRADA", async () => {
    const caja = await useCase.execute({ id: "caja-1", tenantId: TENANT, montoArqueoCaja: 480 })
    expect(caja.estadoCaja).toBe("CERRADA")
    expect(caja.montoArqueoCaja).toBe(480)
  })

  it("emite evento cajaCerrada con tenantId y montoArqueoCaja", async () => {
    await useCase.execute({ id: "caja-1", tenantId: TENANT, montoArqueoCaja: 480 })
    const ev = notificador.events[0]
    expect(ev.event).toBe("cajaCerrada")
    expect(ev.tenantId).toBe(TENANT)
    expect((ev.payload as { montoArqueoCaja: number }).montoArqueoCaja).toBe(480)
  })

  it("lanza CajaYaCerradaError si la caja ya está cerrada", async () => {
    cajaRepo.cajas[0]!.estadoCaja = "CERRADA"
    await expect(
      useCase.execute({ id: "caja-1", tenantId: TENANT, montoArqueoCaja: 480 })
    ).rejects.toThrow(CajaYaCerradaError)
  })
})
