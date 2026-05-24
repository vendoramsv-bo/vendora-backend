import type {
  ICajaRepository,
  CajaAbiertaData,
  IngresoCajaData,
  EgresoCajaData,
  AbrirCajaDTO,
} from "../../src/modules/ventas/domain/ports/ICajaRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"
import { CajaYaAbiertaError, CajaYaCerradaError, CajaNoEncontradaError } from "../../src/modules/ventas/domain/ventas.errors.js"

let idCounter = 1

export class FakeCajaRepository implements ICajaRepository {
  readonly cajas: CajaAbiertaData[] = []
  readonly ingresos: IngresoCajaData[] = []
  readonly egresos: EgresoCajaData[] = []

  async abrir(dto: AbrirCajaDTO): Promise<CajaAbiertaData> {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    const existente = this.cajas.find(
      (c) =>
        c.tenantId === dto.tenantId &&
        c.puntoVentaId === dto.puntoVentaId &&
        c.turnoId === dto.turnoId &&
        c.tenantMemberId === dto.tenantMemberId &&
        c.fecha >= hoy &&
        c.fecha < manana,
    )
    if (existente) throw new CajaYaAbiertaError()

    const id = `caja-${idCounter++}`
    const ingreso: IngresoCajaData = {
      id: `ing-${idCounter++}`,
      aperturaCierreCajaId: id,
      motivo: "Apertura",
      montoIngreso: dto.montoInicial,
    }

    const caja: CajaAbiertaData = {
      id,
      tenantId: dto.tenantId,
      puntoVentaId: dto.puntoVentaId,
      turnoId: dto.turnoId,
      tenantMemberId: dto.tenantMemberId,
      fecha: new Date(),
      montoIngresos: dto.montoInicial,
      montoEgresos: 0,
      montoVentas: 0,
      montoDescuentos: 0,
      montoArqueoCaja: 0,
      estadoCaja: "APERTURADA",
      createdById: dto.createdById ?? null,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: null,
      ingresos: [ingreso],
      egresos: [],
    }
    this.cajas.push(caja)
    this.ingresos.push(ingreso)
    return caja
  }

  async cerrar(id: string, tenantId: string, montoArqueoCaja: number): Promise<CajaAbiertaData> {
    const caja = this.cajas.find((c) => c.id === id && c.tenantId === tenantId)
    if (!caja) throw new CajaNoEncontradaError(id)
    if (caja.estadoCaja === "CERRADA") throw new CajaYaCerradaError()

    caja.estadoCaja = "CERRADA"
    caja.montoArqueoCaja = montoArqueoCaja
    caja.updatedAt = new Date()
    return caja
  }

  async registrarIngreso(id: string, tenantId: string, motivo: string, montoIngreso: number): Promise<IngresoCajaData> {
    const caja = this.cajas.find((c) => c.id === id && c.tenantId === tenantId)
    if (!caja) throw new CajaNoEncontradaError(id)
    if (caja.estadoCaja === "CERRADA") throw new CajaYaCerradaError()

    caja.montoIngresos += montoIngreso
    const ingreso: IngresoCajaData = {
      id: `ing-${idCounter++}`,
      aperturaCierreCajaId: id,
      motivo,
      montoIngreso,
    }
    this.ingresos.push(ingreso)
    return ingreso
  }

  async registrarEgreso(id: string, tenantId: string, motivo: string, montoEgreso: number): Promise<EgresoCajaData> {
    const caja = this.cajas.find((c) => c.id === id && c.tenantId === tenantId)
    if (!caja) throw new CajaNoEncontradaError(id)
    if (caja.estadoCaja === "CERRADA") throw new CajaYaCerradaError()

    caja.montoEgresos += montoEgreso
    const egreso: EgresoCajaData = {
      id: `egr-${idCounter++}`,
      aperturaCierreCajaId: id,
      motivo,
      montoEgreso,
    }
    this.egresos.push(egreso)
    return egreso
  }

  async obtener(id: string, tenantId: string): Promise<CajaAbiertaData | null> {
    return this.cajas.find((c) => c.id === id && c.tenantId === tenantId) ?? null
  }

  async listar(tenantId: string, _params: QueryParams): Promise<{ data: CajaAbiertaData[]; total: number }> {
    const data = this.cajas.filter((c) => c.tenantId === tenantId)
    return { data, total: data.length }
  }
}
