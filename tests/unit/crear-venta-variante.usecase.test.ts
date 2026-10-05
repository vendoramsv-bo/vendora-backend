import { describe, it, expect, beforeEach } from "vitest"
import { CrearVentaUseCase, type CrearVentaInput } from "../../src/modules/ventas/application/venta/crear-venta.usecase.js"
import { FakeVentaRepository } from "../helpers/fake-venta.repository.js"
import { FakeCajaRepository } from "../helpers/fake-caja.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { VarianteRequeridaError } from "../../src/modules/ventas/domain/ventas.errors.js"
import type { IAlmacenInventarioPort, SalidaVentaDetalle } from "../../src/modules/ventas/domain/ports/IAlmacenInventarioPort.js"

const TENANT = "t1"

// Fake del puerto de almacén: registra las llamadas, y puede tardar o fallar
class FakeAlmacenPort implements IAlmacenInventarioPort {
  readonly salidas: Array<{ ventaId: string; detalles: SalidaVentaDetalle[] }> = []
  fallar = false

  async registrarSalidaVenta(ventaId: string, _tenantId: string, detalles: SalidaVentaDetalle[]): Promise<void> {
    await new Promise((r) => setTimeout(r, 5))
    if (this.fallar) throw new Error("fallo de inventario")
    this.salidas.push({ ventaId, detalles })
  }

  async inicializarProducto(): Promise<void> {}
}

describe("CrearVentaUseCase — variante requerida y salida de almacén (spec 027)", () => {
  let repo: FakeVentaRepository
  let almacen: FakeAlmacenPort
  let useCase: CrearVentaUseCase
  let input: CrearVentaInput

  beforeEach(async () => {
    repo = new FakeVentaRepository()
    const cajaRepo = new FakeCajaRepository()
    almacen = new FakeAlmacenPort()
    useCase = new CrearVentaUseCase(repo, cajaRepo, new FakeVentasNotificador(), almacen)
    const caja = await cajaRepo.abrir({
      tenantId: TENANT,
      puntoVentaId: "pv-1",
      turnoId: "turno-1",
      tenantMemberId: `member-${Math.random()}`,
      montoInicial: 0,
    })
    input = {
      tenantId: TENANT,
      puntoVentaId: "pv-1",
      turnoId: "turno-1",
      tenantMemberId: caja.tenantMemberId,
      aperturaCierreCajaId: caja.id,
      tipoPago: "EFECTIVO",
      estadoPago: "PAGADO",
      efectivo: 100,
      referenciaTipo: "PUNTO_DE_VENTA",
      detalles: [
        { productoId: "simple-1", precio: 10, cantidad: 3 },
        { productoId: "con-variantes", varianteId: "var-1", precio: 20, cantidad: 2 },
      ],
    }
  })

  it("rechaza con VarianteRequeridaError una línea sin variante de un producto con variantes y no crea la venta", async () => {
    repo.productosConVariante = ["con-variantes"]
    input.detalles = [
      { productoId: "simple-1", precio: 10, cantidad: 1 },
      { productoId: "con-variantes", precio: 20, cantidad: 1 },
    ]

    const err = await useCase.execute(input).catch((e) => e)
    expect(err).toBeInstanceOf(VarianteRequeridaError)
    expect((err as VarianteRequeridaError).productoIds).toEqual(["con-variantes"])
    expect(repo.ventas).toHaveLength(0)
    expect(almacen.salidas).toHaveLength(0)
  })

  it("con líneas válidas espera la salida de almacén antes de devolver la venta", async () => {
    repo.productosConVariante = ["con-variantes"]
    const venta = await useCase.execute(input)

    expect(almacen.salidas).toHaveLength(1)
    expect(almacen.salidas[0]!.ventaId).toBe(venta.id)
    expect(almacen.salidas[0]!.detalles).toEqual([
      { productoId: "simple-1", varianteId: undefined, cantidad: 3 },
      { productoId: "con-variantes", varianteId: "var-1", cantidad: 2 },
    ])
  })

  it("si la salida de almacén falla, igual devuelve la venta (no relanza)", async () => {
    almacen.fallar = true
    const venta = await useCase.execute(input)
    expect(venta.id).toBeTruthy()
    expect(repo.ventas).toHaveLength(1)
  })
})
