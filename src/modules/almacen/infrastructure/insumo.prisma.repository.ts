import type {
  IInsumoRepository,
  InsumoData,
  CrearInsumoDTO,
  ActualizarInsumoDTO,
  AjusteInsumoDTO,
  AjusteInsumoResultado,
} from "../domain/ports/IInsumoRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { argsListadoMovimientos, TIPOS_MOVIMIENTO_ALMACEN } from "./movimiento-prisma-args.js"

/**
 * Lo que hace que un insumo no se pueda eliminar (spec 033, B-01). El movimiento CREACION
 * no cuenta: todo insumo nace con uno.
 */
const CONTEO_USO = {
  movimientosAlmacen: { where: { tipo: { not: "CREACION" } } },
  ingresosDetalle: true,
  salidasDetalle: true,
  recuentosAlmacenDetalle: true,
} as const

type ConteoUso = Partial<Record<keyof typeof CONTEO_USO | "productosInsumo", number>>

function usoDe(conteo: ConteoUso | undefined, conRecetas: boolean): boolean {
  if (!conteo) return false
  const n =
    (conteo.movimientosAlmacen ?? 0) +
    (conteo.ingresosDetalle ?? 0) +
    (conteo.salidasDetalle ?? 0) +
    (conteo.recuentosAlmacenDetalle ?? 0) +
    (conRecetas ? (conteo.productosInsumo ?? 0) : 0)
  return n > 0
}

function toInsumoData(raw: any): InsumoData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    nombre: raw.nombre,
    unidadMedidaId: raw.unidadMedidaId,
    cantidadStock: Number(raw.cantidadStock),
    stockMinimo: raw.stockMinimo,
    costoUnitario: Number(raw.costoUnitario),
    fechaVencimiento: raw.fechaVencimiento ?? null,
    estado: raw.estado,
    createdAt: raw.createdAt,
  }
}

export class InsumosPrismaRepository implements IInsumoRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async findById(id: string, tenantId: string): Promise<InsumoData | null> {
    const raw = await this.db.insumo.findFirst({ where: { id, tenantId } })
    return raw ? toInsumoData(raw) : null
  }

  async findByNombre(nombre: string, tenantId: string): Promise<InsumoData | null> {
    const raw = await this.db.insumo.findFirst({ where: { nombre, tenantId } })
    return raw ? toInsumoData(raw) : null
  }

  async create(dto: CrearInsumoDTO): Promise<InsumoData> {
    // El stock inicial y su movimiento CREACION van en la misma transacción: el historial
    // explica desde el primer día de dónde salió el stock.
    const stockInicial = dto.stockInicial ?? 0
    const raw = await this.db.$transaction(async (tx: any) => {
      const insumo = await tx.insumo.create({
        data: {
          tenantId: dto.tenantId,
          nombre: dto.nombre,
          unidadMedidaId: dto.unidadMedidaId,
          cantidadStock: stockInicial,
          stockMinimo: dto.stockMinimo ?? 0,
          costoUnitario: dto.costoUnitario ?? 0,
          fechaVencimiento: dto.fechaVencimiento ?? null,
          estado: "ACTIVO",
          createdById: dto.createdById ?? null,
        },
      })
      await tx.movimientoAlmacen.create({
        data: {
          tenantId: dto.tenantId,
          insumoId: insumo.id,
          tipo: "CREACION",
          cantidad: stockInicial,
          motivo: "Creación de insumo",
          stockAntes: 0,
          stockDespues: stockInicial,
          createdById: dto.createdById ?? null,
        },
      })
      return insumo
    })
    return toInsumoData(raw)
  }

  async update(id: string, tenantId: string, dto: ActualizarInsumoDTO): Promise<InsumoData> {
    const raw = await this.db.insumo.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.unidadMedidaId !== undefined && { unidadMedidaId: dto.unidadMedidaId }),
        ...(dto.stockMinimo !== undefined && { stockMinimo: dto.stockMinimo }),
        ...(dto.costoUnitario !== undefined && { costoUnitario: dto.costoUnitario }),
        ...(dto.fechaVencimiento !== undefined && { fechaVencimiento: dto.fechaVencimiento }),
        updatedById: dto.updatedById ?? null,
      },
    })
    return toInsumoData(raw)
  }

  async enUso(id: string, tenantId: string): Promise<boolean> {
    const raw = await this.db.insumo.findFirst({
      where: { id, tenantId },
      select: { _count: { select: CONTEO_USO } },
    })
    return usoDe(raw?._count, false)
  }

  async delete(id: string, _tenantId: string): Promise<void> {
    await this.db.insumo.delete({ where: { id } })
  }

  async cambiarEstado(id: string, _tenantId: string, estado: string, updatedById?: string): Promise<InsumoData> {
    const raw = await this.db.insumo.update({
      where: { id },
      data: { estado, updatedById: updatedById ?? null },
    })
    return toInsumoData(raw)
  }

  async registrarAjuste(dto: AjusteInsumoDTO): Promise<AjusteInsumoResultado> {
    const insumo = await this.db.insumo.findFirst({ where: { id: dto.insumoId, tenantId: dto.tenantId } })
    const stockAntes = Number(insumo.cantidadStock)
    const stockDespues = stockAntes + dto.cantidadAjuste

    await this.db.$transaction([
      this.db.insumo.update({
        where: { id: dto.insumoId },
        data: { cantidadStock: stockDespues },
      }),
      this.db.movimientoAlmacen.create({
        data: {
          tenantId: dto.tenantId,
          insumoId: dto.insumoId,
          tipo: "AJUSTE",
          cantidad: dto.cantidadAjuste,
          motivo: dto.motivo,
          stockAntes,
          stockDespues,
          createdById: dto.createdById ?? null,
        },
      }),
    ])

    return {
      insumoId: dto.insumoId,
      insumoNombre: insumo.nombre as string,
      stockAntes,
      stockDespues,
      stockMinimo: insumo.stockMinimo as number,
    }
  }

  async listar(tenantId: string, params: QueryParams, stockCritico?: boolean) {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["nombre"])
    const where: any = { tenantId, ...whereSearch }
    if (stockCritico) {
      // cantidadStock < stockMinimo — Prisma no soporta comparación entre campos directamente,
      // así que filtramos en JS (aceptable a la escala del módulo)
    }
    const [data, total] = await Promise.all([
      this.db.insumo.findMany({
        where,
        take,
        skip,
        orderBy,
        include: { unidadMedida: true, _count: { select: { ...CONTEO_USO, productosInsumo: true } } },
      }),
      this.db.insumo.count({ where }),
    ])
    // Filtro post-query para stockCritico (comparación de campos)
    // `eliminable` en lugar del conteo: la pantalla deshabilita Eliminar (spec 033, FR-002).
    const conUso = data.map(({ _count, ...i }: any) => ({ ...i, eliminable: !usoDe(_count, true) }))
    const filtered = stockCritico
      ? conUso.filter((i: any) => Number(i.cantidadStock) < i.stockMinimo)
      : conUso
    return { data: filtered, total: stockCritico ? filtered.length : total }
  }

  async listarMovimientos(insumoId: string, tenantId: string, params: QueryParams) {
    const { take, skip, orderBy, where: whereSearch } = argsListadoMovimientos(params, TIPOS_MOVIMIENTO_ALMACEN)
    const where = { insumoId, tenantId, ...whereSearch }
    const [data, total] = await Promise.all([
      this.db.movimientoAlmacen.findMany({ where, take, skip, orderBy }),
      this.db.movimientoAlmacen.count({ where }),
    ])
    // Decimal se serializa como texto: se entregan números, como en el listado del tenant.
    const filas = data.map((m: any) => ({
      ...m,
      cantidad: Number(m.cantidad),
      stockAntes: Number(m.stockAntes),
      stockDespues: Number(m.stockDespues),
    }))
    return { data: filas, total }
  }

  /**
   * Entradas y salidas de todo el historial (spec 033, B-04), por
   * `stockDespues − stockAntes`: el signo de `cantidad` no es uniforme entre tipos
   * (SALIDA la guarda positiva). CREACION cuenta como entrada: el stock inicial.
   */
  async resumenMovimientos(insumoId: string, tenantId: string) {
    const insumo = await this.db.insumo.findFirst({
      where: { id: insumoId, tenantId },
      include: { unidadMedida: true },
    })
    if (!insumo) return null
    const movimientos = await this.db.movimientoAlmacen.findMany({
      where: { insumoId, tenantId },
      select: { stockAntes: true, stockDespues: true },
    })
    let entradas = 0
    let salidas = 0
    for (const m of movimientos) {
      const delta = Number(m.stockDespues) - Number(m.stockAntes)
      if (delta > 0) entradas += delta
      else salidas += delta
    }
    const redondear = (n: number) => Math.round(n * 10000) / 10000
    return {
      entradas: redondear(entradas),
      salidas: redondear(salidas),
      stockActual: Number(insumo.cantidadStock),
      unidad: insumo.unidadMedida?.sigla ?? "",
    }
  }
}
