import type { ICajaRepository, CajaAbiertaData } from "../../domain/ports/ICajaRepository.js"
import type { IPuntoVentaRepository } from "../../domain/ports/IPuntoVentaRepository.js"
import type { ITurnoAtencionRepository } from "../../domain/ports/ITurnoAtencionRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { PuntoVentaInactivoError, TurnoInactivoError, CajaYaAbiertaError } from "../../domain/ventas.errors.js"

export interface AbrirCajaInput {
  tenantId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
  montoInicial: number
  createdById?: string | null
}

export class AbrirCajaUseCase {
  constructor(
    private readonly cajaRepo: ICajaRepository,
    private readonly puntoVentaRepo: IPuntoVentaRepository,
    private readonly turnoRepo: ITurnoAtencionRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: AbrirCajaInput): Promise<CajaAbiertaData> {
    const puntoVenta = await this.puntoVentaRepo.obtener(input.puntoVentaId, input.tenantId)
    if (!puntoVenta || puntoVenta.estado === "INACTIVO") throw new PuntoVentaInactivoError()

    const turno = await this.turnoRepo.obtener(input.turnoId, input.tenantId)
    if (!turno || turno.estado === "INACTIVO") throw new TurnoInactivoError()

    let caja: CajaAbiertaData
    try {
      caja = await this.cajaRepo.abrir({
        tenantId: input.tenantId,
        puntoVentaId: input.puntoVentaId,
        turnoId: input.turnoId,
        tenantMemberId: input.tenantMemberId,
        montoInicial: input.montoInicial,
        createdById: input.createdById ?? null,
      })
    } catch (err) {
      if (err instanceof CajaYaAbiertaError) throw err
      throw err
    }

    this.notificador.cajaAbierta(input.tenantId, {
      cajaId: caja.id,
      tenantId: input.tenantId,
      puntoVentaId: caja.puntoVentaId,
      turnoId: caja.turnoId,
      tenantMemberId: caja.tenantMemberId,
    })

    return caja
  }
}
