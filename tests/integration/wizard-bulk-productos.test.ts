/**
 * Integration tests — sincronización de la selección de Productos en el wizard
 * (specs/018-estandarizar-bulk-wizard, User Story 1).
 *
 * Requiere DATABASE_URL. Skip gracefully cuando no está presente.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "../../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { ProductoPrismaRepository } from "../../src/modules/catalogo/infrastructure/producto.prisma.repository.js"
import {
  crearFixturesCompartidas,
  crearProductoConClasificador,
  crearVentaConDetalle,
  limpiarFixturesCompartidas,
  type WizardBulkFixtures,
} from "../helpers/wizard-bulk-fixtures.js"

const hasDb = !!process.env.DATABASE_URL
const RUN = `wbprod${Date.now()}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any
let repo: ProductoPrismaRepository
let fx: WizardBulkFixtures

describe.skipIf(!hasDb)("wizard /catalogo/productos/bulk — sincronizarSeleccion", () => {
  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
    repo = new ProductoPrismaRepository(prisma)
    fx = await crearFixturesCompartidas(prisma, RUN)
  })

  afterAll(async () => {
    await limpiarFixturesCompartidas(prisma, RUN)
    await prisma.$disconnect()
  })

  it("agrega los productos seleccionados que no existían para el tenant", async () => {
    const claA = await prisma.claProducto.create({
      data: {
        claActividadId: fx.claActividadId,
        claCategoriaId: (await prisma.claCategoria.create({ data: { claActividadId: fx.claActividadId, nombre: `agregar-cat-${RUN}` } })).id,
        claUnidadId: (await prisma.claUnidadMedida.create({ data: { unidad: `agregar-unidad-${RUN}`, sigla: `AGU${RUN}`.slice(0, 15) } })).id,
        codigo: `AGREGAR-${RUN}`,
        nombre: `Producto Agregar ${RUN}`,
        precio: 5,
      },
    })

    const resultado = await repo.sincronizarSeleccion([claA.id], fx.tenantId, fx.userId)
    expect(resultado.creados.length).toBe(1)
    expect(resultado.eliminados).toBe(0)

    const productos = await prisma.producto.findMany({ where: { tenantId: fx.tenantId, codigo: `AGREGAR-${RUN}` } })
    expect(productos.length).toBe(1)

    // FIX clasificadores comunes — el Producto creado desde el catálogo maestro
    // debe guardar claActividadId/claCategoriaId/claProductoId (antes quedaban null).
    expect(productos[0].claActividadId).toBe(fx.claActividadId)
    expect(productos[0].claCategoriaId).toBe(claA.claCategoriaId)
    expect(productos[0].claProductoId).toBe(claA.id)
  })

  it("reenviar la misma selección no crea duplicados", async () => {
    const existente = await prisma.claProducto.findFirst({ where: { codigo: `AGREGAR-${RUN}` } })
    const resultado = await repo.sincronizarSeleccion([existente.id], fx.tenantId, fx.userId)
    expect(resultado.creados.length).toBe(0)

    const productos = await prisma.producto.findMany({ where: { tenantId: fx.tenantId, codigo: `AGREGAR-${RUN}` } })
    expect(productos.length).toBe(1)
  })

  it("BUG REPORTADO — quitar un producto de la selección lo elimina del catálogo del tenant", async () => {
    const p1 = await crearProductoConClasificador(prisma, fx, `SUB-A-${RUN}`, `Producto A ${RUN}`)
    const p2 = await crearProductoConClasificador(prisma, fx, `SUB-B-${RUN}`, `Producto B ${RUN}`)
    const p3 = await crearProductoConClasificador(prisma, fx, `SUB-C-${RUN}`, `Producto C ${RUN}`)

    // Selección inicial: los 3
    let resultado = await repo.sincronizarSeleccion([p1.claProductoId, p2.claProductoId, p3.claProductoId], fx.tenantId, fx.userId)
    expect(resultado.creados.length).toBe(0) // ya existían (creados directamente, no vía altaMasiva)

    let restantes = await prisma.producto.findMany({ where: { tenantId: fx.tenantId, codigo: { in: [`SUB-A-${RUN}`, `SUB-B-${RUN}`, `SUB-C-${RUN}`] } } })
    expect(restantes.length).toBe(3)

    // Reenviar el paso con solo 2 de los 3 (el usuario quitó SUB-C)
    resultado = await repo.sincronizarSeleccion([p1.claProductoId, p2.claProductoId], fx.tenantId, fx.userId)
    expect(resultado.eliminados).toBe(1)
    expect(resultado.protegidos).toBe(0)

    restantes = await prisma.producto.findMany({ where: { tenantId: fx.tenantId, codigo: { in: [`SUB-A-${RUN}`, `SUB-B-${RUN}`, `SUB-C-${RUN}`] } } })
    expect(restantes.map((p: { codigo: string }) => p.codigo).sort()).toEqual([`SUB-A-${RUN}`, `SUB-B-${RUN}`].sort())
  })

  it("protege un producto con VentaDetalle real al deseleccionarlo", async () => {
    const p = await crearProductoConClasificador(prisma, fx, `VENDIDO-${RUN}`, `Producto Vendido ${RUN}`)
    await repo.sincronizarSeleccion([p.claProductoId], fx.tenantId, fx.userId)
    await crearVentaConDetalle(prisma, fx, p.productoId)

    const resultado = await repo.sincronizarSeleccion([], fx.tenantId, fx.userId)
    expect(resultado.protegidos).toBeGreaterThanOrEqual(1)

    const sigueExistiendo = await prisma.producto.findUnique({ where: { id: p.productoId } })
    expect(sigueExistiendo).not.toBeNull()
  })
})
