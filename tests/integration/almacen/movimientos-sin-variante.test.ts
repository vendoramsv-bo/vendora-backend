/**
 * Integración contra PostgreSQL real — spec 027: movimientos de inventario de
 * productos con y sin variante.
 *
 * El defecto original lo lanzaba el cliente Prisma real (`upsert` con
 * `varianteId: null` en la clave compuesta), así que solo un test contra la base
 * lo atrapa. Requiere la migración 20261005000000_movimiento_inventario_nulls_not_distinct.
 *
 * Se omite sin DATABASE_URL. Crea su propio tenant y lo borra al final (cascade).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "../../../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { InventarioProductoPrismaRepository } from "../../../src/modules/almacen/infrastructure/inventario-producto.prisma.repository.js"
import { AlmacenInventarioPortAdapter } from "../../../src/modules/almacen/infrastructure/almacen-inventario.port.adapter.js"
import { registrarMovimiento } from "../../../src/modules/almacen/infrastructure/movimiento-inventario.writer.js"
import { VentaPrismaRepository } from "../../../src/modules/ventas/infrastructure/venta.prisma.repository.js"
import { CajaPrismaRepository } from "../../../src/modules/ventas/infrastructure/caja.prisma.repository.js"
import { CrearVentaUseCase } from "../../../src/modules/ventas/application/venta/crear-venta.usecase.js"
import { VarianteRequeridaError } from "../../../src/modules/ventas/domain/ventas.errors.js"
import { FakeVentasNotificador } from "../../helpers/fake-ventas.notificador.js"

const hasDb = !!process.env.DATABASE_URL

const RUN = `mov027-${Date.now()}`
const TENANT_ID = `t-${RUN}`
const OTRO_TENANT_ID = `t2-${RUN}`
const USER_ID = `u-${RUN}`
const CLA_ID = `cla-${RUN}`

let prisma: PrismaClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any
let repo: InventarioProductoPrismaRepository
let adapter: AlmacenInventarioPortAdapter

const fk = { actividadId: "", categoriaId: "", unidadId: "" }
let contador = 0

async function crearProducto(stock: number, tenantId = TENANT_ID): Promise<string> {
  const n = ++contador
  const p = await db.producto.create({
    data: {
      tenantId,
      ...fk,
      codigo: `P${n}-${RUN}`,
      nombre: `Producto ${n} ${RUN}`,
      cantidadStock: stock,
    },
  })
  return p.id
}

async function crearProductoConVariante(stockVariante: number, inventarioActivado = true) {
  const productoId = await crearProducto(stockVariante)
  const v = await db.productoVariante.create({
    data: { productoId, sku: `V${contador}-${RUN}`, cantidadStock: stockVariante, inventarioActivado },
  })
  return { productoId, varianteId: v.id as string }
}

async function stockDe(productoId: string, varianteId?: string): Promise<number> {
  const fila = varianteId
    ? await db.productoVariante.findUnique({ where: { id: varianteId } })
    : await db.producto.findUnique({ where: { id: productoId } })
  return fila.cantidadStock
}

async function movimientosDe(referenciaId: string) {
  return db.movimientoInventario.findMany({ where: { tenantId: TENANT_ID, referenciaId }, orderBy: { createdAt: "asc" } })
}

describe.skipIf(!hasDb)("Movimientos de inventario con y sin variante — integración (spec 027)", () => {
  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
    db = prisma
    repo = new InventarioProductoPrismaRepository(db)
    adapter = new AlmacenInventarioPortAdapter(repo)

    await db.user.create({ data: { id: USER_ID, name: "Test 027", email: `${RUN}@test.local`, userName: RUN } })
    for (const id of [TENANT_ID, OTRO_TENANT_ID]) {
      await db.tenant.create({
        data: { id, name: id, slug: id, nombreLargo: id, descripcion: "Tenant de test spec 027" },
      })
    }
    await db.claActividadEconomica.create({ data: { id: CLA_ID, codigo: CLA_ID, nombre: "Actividad test 027" } })
    const actividad = await db.actividadEconomica.create({ data: { tenantId: TENANT_ID, claActividadId: CLA_ID } })
    const categoria = await db.categoria.create({
      data: { tenantId: TENANT_ID, actividadId: actividad.id, nombre: `Cat ${RUN}` },
    })
    const unidad = await db.unidadMedida.create({
      data: { tenantId: TENANT_ID, unidad: `U-${RUN}`, sigla: "u", descripcion: "Unidad" },
    })
    fk.actividadId = actividad.id
    fk.categoriaId = categoria.id
    fk.unidadId = unidad.id
  })

  afterAll(async () => {
    if (!prisma) return
    try {
      // El tenant borra en cascada productos, variantes, movimientos, ajustes, recuentos, ventas y cajas
      await db.tenant.deleteMany({ where: { id: { in: [TENANT_ID, OTRO_TENANT_ID] } } })
      await db.claActividadEconomica.deleteMany({ where: { id: CLA_ID } })
      await db.user.deleteMany({ where: { id: USER_ID } })
    } finally {
      await prisma.$disconnect()
    }
  })

  // ─── Helper ────────────────────────────────────────────────────────────────

  describe("registrarMovimiento", () => {
    it("con varianteId null inserta una vez y el reintento no duplica", async () => {
      const productoId = await crearProducto(4)
      const datos = {
        tenantId: TENANT_ID,
        productoId,
        varianteId: null,
        tipo: "SALIDA" as const,
        stockAntes: 4,
        stockDespues: 1,
        referenciaId: `ref-${RUN}-helper`,
      }

      const primero = await prisma.$transaction((tx) => registrarMovimiento(tx, datos))
      const segundo = await prisma.$transaction((tx) => registrarMovimiento(tx, datos))

      expect(primero.insertado).toBe(true)
      expect(segundo.insertado).toBe(false)
      const movs = await movimientosDe(datos.referenciaId)
      expect(movs).toHaveLength(1)
      expect(movs[0].cantidad).toBe(-3)
      expect(movs[0].varianteId).toBeNull()
    })
  })

  // ─── US1 ───────────────────────────────────────────────────────────────────

  describe("salida por venta", () => {
    it("producto simple: descuenta y registra la SALIDA", async () => {
      const productoId = await crearProducto(10)
      const ventaId = `venta-${RUN}-1`

      await adapter.registrarSalidaVenta(ventaId, TENANT_ID, [{ productoId, cantidad: 3 }])

      expect(await stockDe(productoId)).toBe(7)
      const movs = await movimientosDe(ventaId)
      expect(movs).toHaveLength(1)
      expect(movs[0]).toMatchObject({
        tipo: "SALIDA",
        cantidad: -3,
        stockAntes: 10,
        stockDespues: 7,
        referenciaId: ventaId,
        varianteId: null,
        productoId,
      })
    })

    it("variante: descuenta la variante, recalcula el padre y registra la SALIDA", async () => {
      const { productoId, varianteId } = await crearProductoConVariante(5)
      const ventaId = `venta-${RUN}-2`

      await adapter.registrarSalidaVenta(ventaId, TENANT_ID, [{ productoId, varianteId, cantidad: 2 }])

      expect(await stockDe(productoId, varianteId)).toBe(3)
      expect(await stockDe(productoId)).toBe(3)
      const movs = await movimientosDe(ventaId)
      expect(movs).toHaveLength(1)
      expect(movs[0]).toMatchObject({ varianteId, cantidad: -2, stockAntes: 5, stockDespues: 3 })
    })

    it("venta mixta: un movimiento por línea", async () => {
      const simple = await crearProducto(8)
      const { productoId, varianteId } = await crearProductoConVariante(6)
      const ventaId = `venta-${RUN}-3`

      await adapter.registrarSalidaVenta(ventaId, TENANT_ID, [
        { productoId: simple, cantidad: 1 },
        { productoId, varianteId, cantidad: 4 },
      ])

      expect(await stockDe(simple)).toBe(7)
      expect(await stockDe(productoId, varianteId)).toBe(2)
      expect(await movimientosDe(ventaId)).toHaveLength(2)
    })

    it("repetir la salida de la misma venta no cambia stock ni movimientos", async () => {
      const simple = await crearProducto(10)
      const { productoId, varianteId } = await crearProductoConVariante(10)
      const ventaId = `venta-${RUN}-4`
      const detalles = [
        { productoId: simple, cantidad: 2 },
        { productoId, varianteId, cantidad: 3 },
      ]

      await adapter.registrarSalidaVenta(ventaId, TENANT_ID, detalles)
      await adapter.registrarSalidaVenta(ventaId, TENANT_ID, detalles)

      expect(await stockDe(simple)).toBe(8)
      expect(await stockDe(productoId, varianteId)).toBe(7)
      expect(await movimientosDe(ventaId)).toHaveLength(2)
    })

    it("una venta que deja stock negativo registra stockDespues negativo", async () => {
      const productoId = await crearProducto(1)
      const ventaId = `venta-${RUN}-5`

      await adapter.registrarSalidaVenta(ventaId, TENANT_ID, [{ productoId, cantidad: 3 }])

      expect(await stockDe(productoId)).toBe(-2)
      const [mov] = await movimientosDe(ventaId)
      expect(mov).toMatchObject({ stockAntes: 1, stockDespues: -2, cantidad: -3 })
    })

    it("no descuenta un producto de otro tenant y no deja nada a medias", async () => {
      const propio = await crearProducto(5)
      const ajeno = await crearProducto(5, OTRO_TENANT_ID)
      const ventaId = `venta-${RUN}-6`

      await expect(
        adapter.registrarSalidaVenta(ventaId, TENANT_ID, [
          { productoId: propio, cantidad: 1 },
          { productoId: ajeno, cantidad: 1 },
        ]),
      ).rejects.toThrow()

      expect(await stockDe(propio)).toBe(5)
      expect(await stockDe(ajeno)).toBe(5)
      expect(await movimientosDe(ventaId)).toHaveLength(0)
    })
  })

  // ─── US2 ───────────────────────────────────────────────────────────────────

  describe("ajuste y recuento", () => {
    it("ajuste +5 sobre producto simple: aplica el stock y registra el AJUSTE", async () => {
      const productoId = await crearProducto(7)
      const ajuste = await repo.crearAjuste({ tenantId: TENANT_ID, motivo: "test", detalles: [{ productoId, cantidadAjuste: 5 }] })

      await repo.aprobarAjuste({ ajusteId: ajuste.id, tenantId: TENANT_ID, version: ajuste.version })

      expect(await stockDe(productoId)).toBe(12)
      const movs = await movimientosDe(ajuste.id)
      expect(movs).toHaveLength(1)
      expect(movs[0]).toMatchObject({ tipo: "AJUSTE", cantidad: 5, stockAntes: 7, stockDespues: 12, varianteId: null })
    })

    it("recuento con stock físico 9 sobre producto simple: fija el stock y registra el RECUENTO", async () => {
      const productoId = await crearProducto(12)
      const recuento = await repo.crearRecuento({ tenantId: TENANT_ID, detalles: [{ productoId, stockFisico: 9 }] })

      await repo.aprobarRecuento({ recuentoId: recuento.id, tenantId: TENANT_ID, version: recuento.version })

      expect(await stockDe(productoId)).toBe(9)
      const movs = await movimientosDe(recuento.id)
      expect(movs).toHaveLength(1)
      expect(movs[0]).toMatchObject({ tipo: "RECUENTO", cantidad: -3, stockAntes: 12, stockDespues: 9 })
    })

    it("ajuste mixto (simple + variante): aplica ambas líneas", async () => {
      const simple = await crearProducto(3)
      const { productoId, varianteId } = await crearProductoConVariante(4)
      const ajuste = await repo.crearAjuste({
        tenantId: TENANT_ID,
        detalles: [
          { productoId: simple, cantidadAjuste: 2 },
          { productoId, varianteId, cantidadAjuste: -1 },
        ],
      })

      await repo.aprobarAjuste({ ajusteId: ajuste.id, tenantId: TENANT_ID, version: ajuste.version })

      expect(await stockDe(simple)).toBe(5)
      expect(await stockDe(productoId, varianteId)).toBe(3)
      expect(await stockDe(productoId)).toBe(3)
      expect(await movimientosDe(ajuste.id)).toHaveLength(2)
    })

    it("si una línea falla (producto de otro tenant), la otra no se aplica", async () => {
      const propio = await crearProducto(3)
      const ajeno = await crearProducto(3, OTRO_TENANT_ID)
      const ajuste = await repo.crearAjuste({
        tenantId: TENANT_ID,
        detalles: [
          { productoId: propio, cantidadAjuste: 2 },
          { productoId: ajeno, cantidadAjuste: 2 },
        ],
      })

      await expect(
        repo.aprobarAjuste({ ajusteId: ajuste.id, tenantId: TENANT_ID, version: ajuste.version }),
      ).rejects.toThrow()

      expect(await stockDe(propio)).toBe(3)
      expect(await stockDe(ajeno)).toBe(3)
      expect(await movimientosDe(ajuste.id)).toHaveLength(0)
    })
  })

  // ─── US3 ───────────────────────────────────────────────────────────────────

  describe("inicialización", () => {
    it("individual de un producto simple: un CREACION con cantidad 0 y sin tocar el stock", async () => {
      const productoId = await crearProducto(7)

      await repo.inicializarProductoIndividual(TENANT_ID, productoId)
      await repo.inicializarProductoIndividual(TENANT_ID, productoId)

      expect(await stockDe(productoId)).toBe(7)
      const movs = await movimientosDe(`init-${productoId}`)
      expect(movs).toHaveLength(1)
      expect(movs[0]).toMatchObject({ tipo: "CREACION", cantidad: 0, stockAntes: 7, stockDespues: 7, varianteId: null })
    })

    it("masiva: no pisa el stock, es idempotente, activa variantes y no inicializa al padre", async () => {
      const simple = await crearProducto(7)
      const { productoId: padre, varianteId } = await crearProductoConVariante(4, false)

      const primera = await repo.inicializarStockBulk(TENANT_ID)
      const segunda = await repo.inicializarStockBulk(TENANT_ID)

      expect(primera.productosInicializados).toBeGreaterThanOrEqual(1)
      expect(primera.variantesInicializadas).toBeGreaterThanOrEqual(1)
      expect(segunda).toEqual({ productosInicializados: 0, variantesInicializadas: 0 })

      expect(await stockDe(simple)).toBe(7)
      expect(await movimientosDe(`init-${simple}`)).toHaveLength(1)

      const variante = await db.productoVariante.findUnique({ where: { id: varianteId } })
      expect(variante.inventarioActivado).toBe(true)
      expect(variante.cantidadStock).toBe(0)
      expect(await movimientosDe(`init-${varianteId}`)).toHaveLength(1)

      expect(await movimientosDe(`init-${padre}`)).toHaveLength(0)
    })
  })

  // ─── US1 (caso de uso) y US4 ───────────────────────────────────────────────

  describe("venta registrada y confirmada", () => {
    const venta = { puntoVentaId: "", turnoId: "", tenantMemberId: "", aperturaCierreCajaId: "" }

    beforeAll(async () => {
      const pv = await db.puntosDeVenta.create({ data: { tenantId: TENANT_ID, nombre: `PV ${RUN}` } })
      const turno = await db.turnosDeAtencion.create({ data: { tenantId: TENANT_ID, turno: `T ${RUN}` } })
      const miembro = await db.tenantMember.create({ data: { organizationId: TENANT_ID, userId: USER_ID } })
      const caja = await db.aperturaCierreDeCaja.create({
        data: { tenantId: TENANT_ID, puntoVentaId: pv.id, turnoId: turno.id, tenantMemberId: miembro.id, fecha: new Date() },
      })
      Object.assign(venta, { puntoVentaId: pv.id, turnoId: turno.id, tenantMemberId: miembro.id, aperturaCierreCajaId: caja.id })
    })

    function crearVentaUseCase() {
      return new CrearVentaUseCase(new VentaPrismaRepository(db), new CajaPrismaRepository(db), new FakeVentasNotificador(), adapter)
    }

    it("CrearVentaUseCase rechaza una línea sin variante de un producto con variantes activas", async () => {
      const { productoId } = await crearProductoConVariante(5)

      await expect(
        crearVentaUseCase().execute({
          tenantId: TENANT_ID,
          ...venta,
          tipoPago: "EFECTIVO",
          estadoPago: "PAGADO",
          efectivo: 10,
          referenciaTipo: "PUNTO_DE_VENTA",
          detalles: [{ productoId, precio: 10, cantidad: 1 }],
        }),
      ).rejects.toBeInstanceOf(VarianteRequeridaError)

      expect(await db.venta.count({ where: { tenantId: TENANT_ID, ventasDetalle: { some: { productoId } } } })).toBe(0)
    })

    it("la venta descuenta al registrarse y confirmar no vuelve a descontar", async () => {
      const simple = await crearProducto(10)
      const { productoId, varianteId } = await crearProductoConVariante(10)

      const creada = await crearVentaUseCase().execute({
        tenantId: TENANT_ID,
        ...venta,
        tipoPago: "EFECTIVO",
        estadoPago: "EN_ESPERA",
        efectivo: 50,
        referenciaTipo: "PUNTO_DE_VENTA",
        detalles: [
          { productoId: simple, precio: 10, cantidad: 2 },
          { productoId, varianteId, precio: 10, cantidad: 3 },
        ],
      })

      expect(await stockDe(simple)).toBe(8)
      expect(await stockDe(productoId, varianteId)).toBe(7)

      const { advertencias } = await new VentaPrismaRepository(db).confirmar(creada.id, TENANT_ID)

      expect(await stockDe(simple)).toBe(8)
      expect(await stockDe(productoId, varianteId)).toBe(7)
      const movs = await movimientosDe(creada.id)
      expect(movs).toHaveLength(2)
      expect(movs.every((m: { tipo: string }) => m.tipo === "SALIDA")).toBe(true)
      expect(advertencias.some((a) => a.includes("sin inventario activado"))).toBe(false)
    })
  })
})
