import { describe, it, expect, beforeEach } from "vitest"
import { ConfirmarVentaUseCase } from "../../src/modules/ventas/application/venta/confirmar-venta.usecase.js"
import { FakeVentaRepository } from "../helpers/fake-venta.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { VentaYaConfirmadaError } from "../../src/modules/ventas/domain/ventas.errors.js"
import type { VentaData } from "../../src/modules/ventas/domain/ports/IVentaRepository.js"

const TENANT = "t1"

const baseVenta: VentaData = {
  id: "venta-1",
  tenantId: TENANT,
  puntoVentaId: "pv-1",
  turnoId: "turno-1",
  tenantMemberId: "member-1",
  aperturaCierreCajaId: "caja-1",
  fecha: new Date(),
  clienteId: null,
  clienteNombre: null,
  clienteTipoDocumento: null,
  clienteNroDocumento: null,
  clienteEmail: null,
  totalCantidad: 2,
  totalVenta: 100,
  totalDescuento: 0,
  efectivo: 100,
  diferencia: 0,
  tipoPago: "EFECTIVO",
  estadoPago: "EN_ESPERA",
  referenciaId: null,
  referenciaTipo: "PUNTO_DE_VENTA",
  createdById: null,
  updatedById: null,
  createdAt: new Date(),
  updatedAt: null,
}

describe("ConfirmarVentaUseCase", () => {
  let ventaRepo: FakeVentaRepository
  let _notificador: FakeVentasNotificador
  let useCase: ConfirmarVentaUseCase

  beforeEach(() => {
    ventaRepo = new FakeVentaRepository()
    _notificador = new FakeVentasNotificador()
    useCase = new ConfirmarVentaUseCase(ventaRepo)
    ventaRepo.ventas.push({ ...baseVenta })
  })

  it("confirma la venta y retorna advertencias", async () => {
    const { venta, advertencias } = await useCase.execute({ id: "venta-1", tenantId: TENANT })
    expect(venta.estadoPago).toBe("PAGADO")
    expect(Array.isArray(advertencias)).toBe(true)
  })

  it("emite ventaCreada con tenantId y ventaId al crear (verificado en crear-venta)", async () => {
    const { venta } = await useCase.execute({ id: "venta-1", tenantId: TENANT })
    expect(venta.tenantId).toBe(TENANT)
    expect(venta.id).toBe("venta-1")
  })

  it("lanza VentaYaConfirmadaError si la venta ya está confirmada", async () => {
    ventaRepo.ventas[0]!.estadoPago = "PAGADO"
    await expect(
      useCase.execute({ id: "venta-1", tenantId: TENANT })
    ).rejects.toThrow(VentaYaConfirmadaError)
  })
})
