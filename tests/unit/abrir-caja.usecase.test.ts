import { describe, it, expect, beforeEach } from "vitest"
import { AbrirCajaUseCase } from "../../src/modules/ventas/application/caja/abrir-caja.usecase.js"
import { FakeCajaRepository } from "../helpers/fake-caja.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { CajaYaAbiertaError, PuntoVentaInactivoError } from "../../src/modules/ventas/domain/ventas.errors.js"
import type { IPuntoVentaRepository, PuntoVentaData } from "../../src/modules/ventas/domain/ports/IPuntoVentaRepository.js"
import type { ITurnoAtencionRepository, TurnoAtencionData } from "../../src/modules/ventas/domain/ports/ITurnoAtencionRepository.js"

const TENANT = "t1"

const fakePuntoVenta: PuntoVentaData = {
  id: "pv-1",
  tenantId: TENANT,
  nombre: "Caja Principal",
  tipo: "CAJA",
  direccion: null,
  telefono: null,
  sucursal: null,
  estado: "ACTIVO",
  createdById: null,
  updatedById: null,
  createdAt: new Date(),
  updatedAt: null,
}

const fakeTurno: TurnoAtencionData = {
  id: "turno-1",
  tenantId: TENANT,
  turno: "Mañana",
  descripcion: null,
  estado: "ACTIVO",
  createdById: null,
  updatedById: null,
  createdAt: new Date(),
  updatedAt: null,
}

function makePuntoVentaRepo(pv: PuntoVentaData | null): IPuntoVentaRepository {
  return {
    crear: async () => { throw new Error("not impl") },
    actualizar: async () => { throw new Error("not impl") },
    cambiarEstado: async () => { throw new Error("not impl") },
    obtener: async () => pv,
    listar: async () => ({ data: [], total: 0 }),
  }
}

function makeTurnoRepo(turno: TurnoAtencionData | null): ITurnoAtencionRepository {
  return {
    crear: async () => { throw new Error("not impl") },
    actualizar: async () => { throw new Error("not impl") },
    cambiarEstado: async () => { throw new Error("not impl") },
    obtener: async () => turno,
    listar: async () => ({ data: [], total: 0 }),
  }
}

describe("AbrirCajaUseCase", () => {
  let cajaRepo: FakeCajaRepository
  let notificador: FakeVentasNotificador
  let useCase: AbrirCajaUseCase

  const input = {
    tenantId: TENANT,
    puntoVentaId: "pv-1",
    turnoId: "turno-1",
    tenantMemberId: "member-1",
    montoInicial: 500,
    createdById: null,
  }

  beforeEach(() => {
    cajaRepo = new FakeCajaRepository()
    notificador = new FakeVentasNotificador()
    useCase = new AbrirCajaUseCase(cajaRepo, makePuntoVentaRepo(fakePuntoVenta), makeTurnoRepo(fakeTurno), notificador)
  })

  it("abre la caja y emite evento cajaAbierta", async () => {
    const caja = await useCase.execute(input)
    expect(caja.estadoCaja).toBe("APERTURADA")
    expect(caja.montoIngresos).toBe(500)
    const ev = notificador.events[0]
    expect(ev.event).toBe("cajaAbierta")
    expect(ev.tenantId).toBe(TENANT)
  })

  it("lanza CajaYaAbiertaError si ya existe apertura activa para mismo punto/turno/miembro/fecha", async () => {
    await useCase.execute(input)
    await expect(useCase.execute(input)).rejects.toThrow(CajaYaAbiertaError)
  })

  it("lanza PuntoVentaInactivoError si el punto de venta está INACTIVO", async () => {
    const ucInactivo = new AbrirCajaUseCase(
      cajaRepo,
      makePuntoVentaRepo({ ...fakePuntoVenta, estado: "INACTIVO" }),
      makeTurnoRepo(fakeTurno),
      notificador,
    )
    await expect(ucInactivo.execute(input)).rejects.toThrow(PuntoVentaInactivoError)
  })
})
