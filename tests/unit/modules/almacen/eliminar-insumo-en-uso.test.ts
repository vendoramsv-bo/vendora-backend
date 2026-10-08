/**
 * Un insumo en uso no se elimina (spec 033, B-01).
 *
 * Las FK de movimientos y de líneas de documentos son `onDelete: Cascade`: borrar un
 * insumo borraba su historial y líneas de documentos aprobados. Todo insumo nace con un
 * movimiento CREACION, así que ese no cuenta: si contara, ninguno sería eliminable.
 */
import { describe, it, expect, vi } from "vitest"
import { InsumosPrismaRepository } from "../../../../src/modules/almacen/infrastructure/insumo.prisma.repository.js"
import { EliminarInsumoUseCase } from "../../../../src/modules/almacen/application/insumo/eliminar-insumo.usecase.js"
import {
  InsumoEnUsoError,
  InsumoEnUsoEnRecetaError,
} from "../../../../src/modules/almacen/domain/almacen.errors.js"
import type { IRecetaProductoRepository } from "../../../../src/modules/almacen/domain/ports/IRecetaProductoRepository.js"

type Conteo = {
  movimientosAlmacen: number
  ingresosDetalle: number
  salidasDetalle: number
  recuentosAlmacenDetalle: number
  productosInsumo: number
}

const SIN_USO: Conteo = { movimientosAlmacen: 0, ingresosDetalle: 0, salidasDetalle: 0, recuentosAlmacenDetalle: 0, productosInsumo: 0 }

function dbFalsa(conteo: Partial<Conteo> = {}) {
  const fila = { id: "i1", tenantId: "t", nombre: "Azúcar", cantidadStock: "0", costoUnitario: "0", _count: { ...SIN_USO, ...conteo } }
  return {
    insumo: {
      findFirst: vi.fn().mockResolvedValue(fila),
      findMany: vi.fn().mockResolvedValue([fila]),
      count: vi.fn().mockResolvedValue(1),
      delete: vi.fn(),
    },
  }
}

const recetaSin = { findReferencingProducts: vi.fn().mockResolvedValue([]) } as unknown as IRecetaProductoRepository

describe("EliminarInsumoUseCase", () => {
  it("con solo el movimiento CREACION se elimina", async () => {
    const db = dbFalsa()
    await new EliminarInsumoUseCase(new InsumosPrismaRepository(db), recetaSin).execute("i1", "t")
    expect(db.insumo.delete).toHaveBeenCalled()
    // El conteo de movimientos deja afuera CREACION.
    const args = db.insumo.findFirst.mock.calls.at(-1)![0]
    expect(args.select?._count?.select?.movimientosAlmacen).toEqual({ where: { tipo: { not: "CREACION" } } })
  })

  it.each([
    ["un movimiento de ingreso, salida, ajuste o recuento", { movimientosAlmacen: 1 }],
    ["una línea de ingreso pendiente", { ingresosDetalle: 1 }],
    ["una línea de salida", { salidasDetalle: 1 }],
    ["una línea de recuento", { recuentosAlmacenDetalle: 1 }],
  ])("con %s responde INSUMO_EN_USO y no borra", async (_caso, conteo) => {
    const db = dbFalsa(conteo)
    const err = await new EliminarInsumoUseCase(new InsumosPrismaRepository(db), recetaSin)
      .execute("i1", "t")
      .catch((e) => e)
    expect(err).toBeInstanceOf(InsumoEnUsoError)
    expect(err.code).toBe("INSUMO_EN_USO")
    expect(err.statusCode).toBe(409)
    expect(db.insumo.delete).not.toHaveBeenCalled()
  })

  it("en una receta sigue respondiendo INSUMO_EN_USO_EN_RECETA", async () => {
    const receta = { findReferencingProducts: vi.fn().mockResolvedValue(["p1"]) } as unknown as IRecetaProductoRepository
    await expect(
      new EliminarInsumoUseCase(new InsumosPrismaRepository(dbFalsa()), receta).execute("i1", "t"),
    ).rejects.toBeInstanceOf(InsumoEnUsoEnRecetaError)
  })
})

describe("listado: eliminable", () => {
  it.each([
    [{}, true],
    [{ movimientosAlmacen: 2 }, false],
    [{ salidasDetalle: 1 }, false],
    [{ productosInsumo: 1 }, false],
  ])("con %o → %s, y sin exponer el conteo", async (conteo, eliminable) => {
    const { data } = await new InsumosPrismaRepository(dbFalsa(conteo)).listar("t", {
      take: 20,
      skip: 0,
      order: "desc",
    } as never)
    const fila = data[0] as Record<string, unknown>
    expect(fila.eliminable).toBe(eliminable)
    expect(fila._count).toBeUndefined()
  })
})
