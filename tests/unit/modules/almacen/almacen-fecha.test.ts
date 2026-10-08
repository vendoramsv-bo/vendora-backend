/**
 * Fecha del documento y textos vaciables en ingresos y salidas de almacén (spec 033, B-03).
 *
 * Igual que ajustes y recuentos en la 032: la persona declara la fecha (sin límite hacia
 * atrás), el servidor rechaza una posterior a ahora, y `descripcion` / `motivo` en `null`
 * vacían el campo. El detalle del ingreso devuelve la fecha y el proveedor.
 */
import { describe, it, expect, vi } from "vitest"
import { CrearIngresoUseCase } from "../../../../src/modules/almacen/application/almacen/crear-ingreso.usecase.js"
import { ActualizarIngresoUseCase } from "../../../../src/modules/almacen/application/almacen/actualizar-ingreso.usecase.js"
import { CrearSalidaUseCase } from "../../../../src/modules/almacen/application/almacen/crear-salida.usecase.js"
import { ActualizarSalidaUseCase } from "../../../../src/modules/almacen/application/almacen/actualizar-salida.usecase.js"
import { FechaFuturaError } from "../../../../src/modules/almacen/domain/almacen.errors.js"
import { IngresoAlmacenPrismaRepository } from "../../../../src/modules/almacen/infrastructure/ingreso-almacen.prisma.repository.js"
import { SalidaAlmacenPrismaRepository } from "../../../../src/modules/almacen/infrastructure/salida-almacen.prisma.repository.js"
import {
  ActualizarIngresoSchema,
  ActualizarSalidaSchema,
  CrearIngresoSchema,
  CrearSalidaSchema,
  RecuentoAlmacenSchema,
} from "../../../../src/modules/almacen/adapters/almacen.schema.js"
import type { IIngresoAlmacenRepository } from "../../../../src/modules/almacen/domain/ports/IIngresoAlmacenRepository.js"
import type { ISalidaAlmacenRepository } from "../../../../src/modules/almacen/domain/ports/ISalidaAlmacenRepository.js"
import type { IInsumoRepository } from "../../../../src/modules/almacen/domain/ports/IInsumoRepository.js"

const AYER = new Date(Date.now() - 24 * 60 * 60 * 1000)
const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000)

const insumoRepo = { findById: vi.fn().mockResolvedValue({ id: "i1" }) } as unknown as IInsumoRepository
const dbConProveedor = { proveedor: { findFirst: vi.fn().mockResolvedValue({ id: "p1" }) } }

function ingresoRepo() {
  return {
    create: vi.fn().mockResolvedValue({ ingresoId: "g1" }),
    actualizarIngreso: vi.fn().mockResolvedValue({ id: "g1" }),
  } as unknown as IIngresoAlmacenRepository & Record<string, ReturnType<typeof vi.fn>>
}

function salidaRepo() {
  return {
    create: vi.fn().mockResolvedValue({ salidaId: "s1" }),
    actualizarSalida: vi.fn().mockResolvedValue({ id: "s1" }),
  } as unknown as ISalidaAlmacenRepository & Record<string, ReturnType<typeof vi.fn>>
}

const detalle = [{ insumoId: "i1", cantidad: 2 }]

describe("crear con fecha", () => {
  it("un ingreso pasa la fecha declarada al repositorio", async () => {
    const repo = ingresoRepo()
    await new CrearIngresoUseCase(repo, insumoRepo, dbConProveedor).execute({
      tenantId: "t",
      proveedorId: "p1",
      fecha: AYER,
      detalles: detalle,
    })
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ fecha: AYER }))
  })

  it("una salida pasa la fecha declarada al repositorio", async () => {
    const repo = salidaRepo()
    await new CrearSalidaUseCase(repo, insumoRepo).execute({ tenantId: "t", fecha: AYER, detalles: detalle })
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ fecha: AYER }))
  })

  it("una fecha futura se rechaza sin tocar el repositorio", async () => {
    const ri = ingresoRepo()
    const rs = salidaRepo()
    await expect(
      new CrearIngresoUseCase(ri, insumoRepo, dbConProveedor).execute({
        tenantId: "t",
        proveedorId: "p1",
        fecha: MANANA,
        detalles: detalle,
      }),
    ).rejects.toBeInstanceOf(FechaFuturaError)
    await expect(
      new CrearSalidaUseCase(rs, insumoRepo).execute({ tenantId: "t", fecha: MANANA, detalles: detalle }),
    ).rejects.toBeInstanceOf(FechaFuturaError)
    expect(ri.create).not.toHaveBeenCalled()
    expect(rs.create).not.toHaveBeenCalled()
  })
})

describe("editar fecha y textos", () => {
  it("una fecha pasada se acepta al editar un ingreso y una salida", async () => {
    const ri = ingresoRepo()
    const rs = salidaRepo()
    await new ActualizarIngresoUseCase(ri).execute("g1", "t", { fecha: AYER })
    await new ActualizarSalidaUseCase(rs).execute("s1", "t", { fecha: AYER })
    expect(ri.actualizarIngreso).toHaveBeenCalledWith("g1", "t", { fecha: AYER })
    expect(rs.actualizarSalida).toHaveBeenCalledWith("s1", "t", { fecha: AYER })
  })

  it("una fecha futura se rechaza al editar", async () => {
    const ri = ingresoRepo()
    const rs = salidaRepo()
    await expect(new ActualizarIngresoUseCase(ri).execute("g1", "t", { fecha: MANANA })).rejects.toBeInstanceOf(
      FechaFuturaError,
    )
    await expect(new ActualizarSalidaUseCase(rs).execute("s1", "t", { fecha: MANANA })).rejects.toBeInstanceOf(
      FechaFuturaError,
    )
    expect(ri.actualizarIngreso).not.toHaveBeenCalled()
    expect(rs.actualizarSalida).not.toHaveBeenCalled()
  })

  it("los esquemas aceptan fecha y null para vaciar descripción y motivo", () => {
    const iso = AYER.toISOString()
    expect(CrearIngresoSchema.parse({ proveedorId: "p", fecha: iso, detalles: detalle }).fecha).toBe(iso)
    expect(CrearSalidaSchema.parse({ fecha: iso, detalles: detalle }).fecha).toBe(iso)
    expect(RecuentoAlmacenSchema.parse({ fecha: iso, detalles: [{ insumoId: "i", stockFisico: 1 }] }).fecha).toBe(iso)
    expect(ActualizarIngresoSchema.parse({ descripcion: null }).descripcion).toBeNull()
    const s = ActualizarSalidaSchema.parse({ motivo: null, descripcion: null, fecha: iso })
    expect(s.motivo).toBeNull()
    expect(s.descripcion).toBeNull()
  })
})

describe("repositorios", () => {
  const raw = {
    id: "g1",
    tenantId: "t",
    proveedorId: "p1",
    proveedor: { id: "p1", nombre: "Molinos" },
    fecha: AYER,
    descripcion: null,
    motivo: null,
    estado: "PENDIENTE",
    version: 0,
    detalles: [],
  }

  it("el detalle del ingreso devuelve la fecha y el proveedor", async () => {
    const db = { ingresoAlmacen: { findFirst: vi.fn().mockResolvedValue(raw) } }
    const doc = await new IngresoAlmacenPrismaRepository(db).obtenerIngreso("g1", "t")
    expect(doc?.fecha).toEqual(AYER)
    expect(doc?.proveedor).toEqual({ id: "p1", nombre: "Molinos" })
  })

  it("el detalle de la salida devuelve la fecha", async () => {
    const db = { salidaAlmacen: { findFirst: vi.fn().mockResolvedValue({ ...raw, id: "s1" }) } }
    const doc = await new SalidaAlmacenPrismaRepository(db).obtenerSalida("s1", "t")
    expect(doc?.fecha).toEqual(AYER)
  })

  it("descripcion null en actualizar vacía el campo del ingreso", async () => {
    const update = vi.fn().mockResolvedValue(raw)
    const db = { ingresoAlmacen: { findFirst: vi.fn().mockResolvedValue(raw), update } }
    await new IngresoAlmacenPrismaRepository(db).actualizarIngreso("g1", "t", { descripcion: null, fecha: AYER })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ descripcion: null, fecha: AYER }) }),
    )
  })

  it("motivo null en actualizar vacía el campo de la salida", async () => {
    const update = vi.fn().mockResolvedValue({ ...raw, id: "s1" })
    const db = { salidaAlmacen: { findFirst: vi.fn().mockResolvedValue(raw), update } }
    await new SalidaAlmacenPrismaRepository(db).actualizarSalida("s1", "t", { motivo: null, descripcion: null })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ motivo: null, descripcion: null }) }),
    )
  })
})
