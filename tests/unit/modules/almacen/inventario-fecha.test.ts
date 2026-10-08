/**
 * Fecha del documento y motivo/observación vaciable en ajustes y recuentos (spec 032,
 * B-02 y B-04).
 *
 * Antes ni crear ni editar aceptaban `fecha`: siempre era la de alta, y el detalle no la
 * devolvía. Ahora la persona declara la fecha (sin límite hacia atrás) y el servidor
 * rechaza una posterior a ahora. `motivo: null` / `observacion: null` vacían el campo.
 */
import { describe, it, expect, vi } from "vitest"
import { CrearAjusteUseCase } from "../../../../src/modules/almacen/application/inventario/crear-ajuste.usecase.js"
import { ActualizarAjusteUseCase } from "../../../../src/modules/almacen/application/inventario/actualizar-ajuste.usecase.js"
import { CrearRecuentoUseCase } from "../../../../src/modules/almacen/application/inventario/crear-recuento.usecase.js"
import { ActualizarRecuentoUseCase } from "../../../../src/modules/almacen/application/inventario/actualizar-recuento.usecase.js"
import { FechaFuturaError } from "../../../../src/modules/almacen/domain/almacen.errors.js"
import type { IInventarioProductoRepository } from "../../../../src/modules/almacen/domain/ports/IInventarioProductoRepository.js"
import { ActualizarAjusteSchema, ActualizarRecuentoSchema } from "../../../../src/modules/almacen/adapters/almacen.schema.js"

const AYER = new Date(Date.now() - 24 * 60 * 60 * 1000)
const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000)

function repoFalso() {
  return {
    crearAjuste: vi.fn().mockResolvedValue({ id: "a1" }),
    actualizarAjuste: vi.fn().mockResolvedValue({ id: "a1" }),
    crearRecuento: vi.fn().mockResolvedValue({ id: "r1" }),
    actualizarRecuento: vi.fn().mockResolvedValue({ id: "r1" }),
  } as unknown as IInventarioProductoRepository & Record<string, ReturnType<typeof vi.fn>>
}

const detalleAjuste = [{ productoId: "p1", cantidadAjuste: 1 }]
const detalleRecuento = [{ productoId: "p1", stockFisico: 3 }]

describe("crear con fecha", () => {
  it("un ajuste pasa la fecha declarada al repositorio", async () => {
    const repo = repoFalso()
    await new CrearAjusteUseCase(repo).execute({ tenantId: "t", fecha: AYER, detalles: detalleAjuste })
    expect(repo.crearAjuste).toHaveBeenCalledWith(expect.objectContaining({ fecha: AYER }))
  })

  it("un recuento pasa la fecha declarada al repositorio", async () => {
    const repo = repoFalso()
    await new CrearRecuentoUseCase(repo).execute({ tenantId: "t", fecha: AYER, detalles: detalleRecuento })
    expect(repo.crearRecuento).toHaveBeenCalledWith(expect.objectContaining({ fecha: AYER }))
  })

  it("sin fecha deja que la base ponga ahora", async () => {
    const repo = repoFalso()
    await new CrearAjusteUseCase(repo).execute({ tenantId: "t", detalles: detalleAjuste })
    expect(repo.crearAjuste).toHaveBeenCalledWith(expect.objectContaining({ fecha: undefined }))
  })

  it("una fecha futura se rechaza sin tocar el repositorio", async () => {
    const repo = repoFalso()
    await expect(
      new CrearAjusteUseCase(repo).execute({ tenantId: "t", fecha: MANANA, detalles: detalleAjuste }),
    ).rejects.toBeInstanceOf(FechaFuturaError)
    await expect(
      new CrearRecuentoUseCase(repo).execute({ tenantId: "t", fecha: MANANA, detalles: detalleRecuento }),
    ).rejects.toBeInstanceOf(FechaFuturaError)
    expect(repo.crearAjuste).not.toHaveBeenCalled()
    expect(repo.crearRecuento).not.toHaveBeenCalled()
  })

  it("el error lleva el código FECHA_FUTURA y status 422", () => {
    const e = new FechaFuturaError()
    expect(e.code).toBe("FECHA_FUTURA")
    expect(e.statusCode).toBe(422)
  })
})

describe("editar fecha", () => {
  it("una fecha pasada se acepta, sin límite hacia atrás", async () => {
    const repo = repoFalso()
    const hace2Anios = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
    await new ActualizarAjusteUseCase(repo).execute("a1", "t", { fecha: hace2Anios })
    expect(repo.actualizarAjuste).toHaveBeenCalledWith("a1", "t", { fecha: hace2Anios })
  })

  it("una fecha futura se rechaza al editar", async () => {
    const repo = repoFalso()
    await expect(new ActualizarAjusteUseCase(repo).execute("a1", "t", { fecha: MANANA })).rejects.toBeInstanceOf(
      FechaFuturaError,
    )
    await expect(new ActualizarRecuentoUseCase(repo).execute("r1", "t", { fecha: MANANA })).rejects.toBeInstanceOf(
      FechaFuturaError,
    )
  })
})

describe("vaciar motivo y observación (B-04)", () => {
  it("el schema de editar acepta null", () => {
    expect(ActualizarAjusteSchema.parse({ motivo: null })).toEqual({ motivo: null })
    expect(ActualizarRecuentoSchema.parse({ observacion: null })).toEqual({ observacion: null })
  })

  it("el schema sigue rechazando un motivo vacío", () => {
    expect(ActualizarAjusteSchema.safeParse({ motivo: "" }).success).toBe(false)
  })

  it("el schema acepta la fecha como date-time y rechaza una fecha sola", () => {
    expect(ActualizarAjusteSchema.safeParse({ fecha: "2026-10-01T04:00:00.000Z" }).success).toBe(true)
    expect(ActualizarAjusteSchema.safeParse({ fecha: "2026-10-01" }).success).toBe(false)
  })

  it("null llega al repositorio para vaciar", async () => {
    const repo = repoFalso()
    await new ActualizarAjusteUseCase(repo).execute("a1", "t", { motivo: null })
    expect(repo.actualizarAjuste).toHaveBeenCalledWith("a1", "t", { motivo: null })
  })
})
