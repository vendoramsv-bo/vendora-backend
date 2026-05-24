import type {
  ICajaRepository,
  CajaAbiertaData,
  IngresoCajaData,
  EgresoCajaData,
  AbrirCajaDTO,
} from "../domain/ports/ICajaRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { CajaYaAbiertaError } from "../domain/ventas.errors.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toIngreso(raw: any): IngresoCajaData {
  return {
    id: raw.id,
    aperturaCierreCajaId: raw.aperturaCierreCajaId,
    motivo: raw.motivo,
    montoIngreso: Number(raw.montoIngreso),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEgreso(raw: any): EgresoCajaData {
  return {
    id: raw.id,
    aperturaCierreCajaId: raw.aperturaCierreCajaId,
    motivo: raw.motivo,
    montoEgreso: Number(raw.montoEgreso),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCajaData(raw: any): CajaAbiertaData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    puntoVentaId: raw.puntoVentaId,
    turnoId: raw.turnoId,
    tenantMemberId: raw.tenantMemberId,
    fecha: raw.fecha,
    montoIngresos: Number(raw.montoIngresos),
    montoEgresos: Number(raw.montoEgresos),
    montoVentas: Number(raw.montoVentas),
    montoDescuentos: Number(raw.montoDescuentos),
    montoArqueoCaja: Number(raw.montoArqueoCaja),
    estadoCaja: raw.estadoCaja,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
    ingresos: raw.ingresosCaja ? raw.ingresosCaja.map(toIngreso) : undefined,
    egresos: raw.egresosCaja ? raw.egresosCaja.map(toEgreso) : undefined,
  }
}

const includeMovimientos = {
  ingresosCaja: true,
  egresosCaja: true,
}

export class CajaPrismaRepository implements ICajaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async abrir(dto: AbrirCajaDTO): Promise<CajaAbiertaData> {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    const existente = await this.db.aperturaCierreDeCaja.findFirst({
      where: {
        tenantId: dto.tenantId,
        puntoVentaId: dto.puntoVentaId,
        turnoId: dto.turnoId,
        tenantMemberId: dto.tenantMemberId,
        fecha: { gte: hoy, lt: manana },
      },
    })
    if (existente) throw new CajaYaAbiertaError()

    const raw = await this.db.$transaction(async (tx: any) => {
      const caja = await tx.aperturaCierreDeCaja.create({
        data: {
          tenantId: dto.tenantId,
          puntoVentaId: dto.puntoVentaId,
          turnoId: dto.turnoId,
          tenantMemberId: dto.tenantMemberId,
          fecha: new Date(),
          montoIngresos: dto.montoInicial,
          estadoCaja: "APERTURADA",
          createdById: dto.createdById ?? null,
        },
      })
      await tx.ingresosCaja.create({
        data: {
          aperturaCierreCajaId: caja.id,
          motivo: "Apertura",
          montoIngreso: dto.montoInicial,
        },
      })
      return tx.aperturaCierreDeCaja.findUnique({
        where: { id: caja.id },
        include: includeMovimientos,
      })
    })

    return toCajaData(raw)
  }

  async cerrar(id: string, tenantId: string, montoArqueoCaja: number, updatedById?: string | null): Promise<CajaAbiertaData> {
    const raw = await this.db.$transaction(async (tx: any) => {
      await tx.aperturaCierreDeCaja.update({
        where: { id, tenantId },
        data: {
          estadoCaja: "CERRADA",
          montoArqueoCaja,
          updatedById: updatedById ?? null,
        },
      })
      return tx.aperturaCierreDeCaja.findUnique({
        where: { id },
        include: includeMovimientos,
      })
    })
    return toCajaData(raw)
  }

  async registrarIngreso(id: string, tenantId: string, motivo: string, montoIngreso: number): Promise<IngresoCajaData> {
    const raw = await this.db.$transaction(async (tx: any) => {
      const ingreso = await tx.ingresosCaja.create({
        data: { aperturaCierreCajaId: id, motivo, montoIngreso },
      })
      await tx.aperturaCierreDeCaja.update({
        where: { id, tenantId },
        data: { montoIngresos: { increment: montoIngreso } },
      })
      return ingreso
    })
    return toIngreso(raw)
  }

  async registrarEgreso(id: string, tenantId: string, motivo: string, montoEgreso: number): Promise<EgresoCajaData> {
    const raw = await this.db.$transaction(async (tx: any) => {
      const egreso = await tx.egresosCaja.create({
        data: { aperturaCierreCajaId: id, motivo, montoEgreso },
      })
      await tx.aperturaCierreDeCaja.update({
        where: { id, tenantId },
        data: { montoEgresos: { increment: montoEgreso } },
      })
      return egreso
    })
    return toEgreso(raw)
  }

  async obtener(id: string, tenantId: string): Promise<CajaAbiertaData | null> {
    const raw = await this.db.aperturaCierreDeCaja.findFirst({
      where: { id, tenantId },
      include: includeMovimientos,
    })
    return raw ? toCajaData(raw) : null
  }

  async listar(tenantId: string, params: QueryParams, estadoCaja?: string, puntoVentaId?: string): Promise<{ data: CajaAbiertaData[]; total: number }> {
    const args = toPrismaArgs(params)
    const where = {
      ...args.where,
      tenantId,
      ...(estadoCaja && { estadoCaja }),
      ...(puntoVentaId && { puntoVentaId }),
    }
    const [data, total] = await Promise.all([
      this.db.aperturaCierreDeCaja.findMany({ where, take: args.take, skip: args.skip, orderBy: args.orderBy }),
      this.db.aperturaCierreDeCaja.count({ where }),
    ])
    return { data: data.map(toCajaData), total }
  }
}
