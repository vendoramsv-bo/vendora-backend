/**
 * El resumen del historial de un producto (spec 032, B-03).
 */
import { describe, it, expect, vi } from "vitest"
import { ResumenMovimientosUseCase } from "../../../../src/modules/almacen/application/movimiento/resumen-movimientos.usecase.js"
import {
  MovimientoResumenPrismaRepository,
  etiquetaDeVariante,
} from "../../../../src/modules/almacen/infrastructure/movimiento-resumen.prisma.repository.js"
import {
  ProductoNoEncontradoError,
  VarianteNoEncontradaError,
} from "../../../../src/modules/almacen/domain/almacen.errors.js"

function dbFalsa({
  producto = { cantidadStock: 12, variantes: [] as unknown[] } as unknown,
  variante = { cantidadStock: 4 } as unknown,
  entradas = 20 as number | null,
  salidas = -8 as number | null,
} = {}) {
  const aggregate = vi.fn().mockImplementation(({ where }) =>
    Promise.resolve({ _sum: { cantidad: where.cantidad.gt !== undefined ? entradas : salidas } }),
  )
  return {
    producto: { findFirst: vi.fn().mockResolvedValue(producto) },
    productoVariante: { findFirst: vi.fn().mockResolvedValue(variante) },
    movimientoInventario: { aggregate },
  }
}

const caso = (db: ReturnType<typeof dbFalsa>) => new ResumenMovimientosUseCase(new MovimientoResumenPrismaRepository(db))

describe("ResumenMovimientosUseCase", () => {
  it("producto: entradas y salidas por signo y el stock del producto", async () => {
    const db = dbFalsa()
    const r = await caso(db).execute("t", "p1")
    expect(r).toEqual({ entradas: 20, salidas: -8, stockActual: 12, variantes: [] })
    const wheres = db.movimientoInventario.aggregate.mock.calls.map((c) => c[0].where)
    expect(wheres).toContainEqual({ tenantId: "t", productoId: "p1", cantidad: { gt: 0 } })
    expect(wheres).toContainEqual({ tenantId: "t", productoId: "p1", cantidad: { lt: 0 } })
  })

  it("con variante: suma solo esa variante y su stock es el actual", async () => {
    const db = dbFalsa()
    const r = await caso(db).execute("t", "p1", "v1")
    expect(r.stockActual).toBe(4)
    const wheres = db.movimientoInventario.aggregate.mock.calls.map((c) => c[0].where)
    expect(wheres.every((w) => w.varianteId === "v1")).toBe(true)
    expect(db.productoVariante.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "v1", productoId: "p1", producto: { tenantId: "t" } } }),
    )
  })

  it("sin movimientos, entradas y salidas en 0", async () => {
    const r = await caso(dbFalsa({ entradas: null, salidas: null })).execute("t", "p1")
    expect(r.entradas).toBe(0)
    expect(r.salidas).toBe(0)
  })

  it("lista el stock de cada variante activa con su etiqueta", async () => {
    const db = dbFalsa({
      producto: {
        cantidadStock: 0,
        variantes: [
          {
            id: "v1",
            sku: null,
            cantidadStock: 3,
            atributos: [
              { atributoValor: { valor: "M", atributo: { orden: 1 } } },
              { atributoValor: { valor: "Rojo", atributo: { orden: 0 } } },
            ],
          },
          { id: "v2", sku: "SKU-9", cantidadStock: 1, atributos: [] },
        ],
      },
    })
    const r = await caso(db).execute("t", "p1")
    expect(r.variantes).toEqual([
      { varianteId: "v1", etiqueta: "Rojo · M", stock: 3 },
      { varianteId: "v2", etiqueta: "SKU-9", stock: 1 },
    ])
    expect(db.producto.findFirst.mock.calls[0]![0].select.variantes.where).toEqual({ estado: "ACTIVO" })
  })

  it("producto inexistente o de otro tenant → no encontrado", async () => {
    await expect(caso(dbFalsa({ producto: null })).execute("t", "p1")).rejects.toBeInstanceOf(ProductoNoEncontradoError)
  })

  it("variante que no es del producto → no encontrada", async () => {
    await expect(caso(dbFalsa({ variante: null })).execute("t", "p1", "vx")).rejects.toBeInstanceOf(
      VarianteNoEncontradaError,
    )
  })
})

describe("etiquetaDeVariante", () => {
  it("sin atributos ni SKU dice 'Variante'", () => {
    expect(etiquetaDeVariante({ sku: "  ", atributos: [] })).toBe("Variante")
  })
})
