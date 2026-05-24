import type {
  IReporteRepository,
  ReporteIngresoDTO,
  ReporteFiltros,
} from "../domain/ports/IReporteRepository.js"

export class ReportePrismaRepository implements IReporteRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async getConsolidado(
    tenantId: string,
    filters: ReporteFiltros,
    take: number,
    skip: number,
  ): Promise<{ data: ReporteIngresoDTO[]; total: number }> {
    const dateFilter = {
      ...(filters.fechaDesde && { gte: filters.fechaDesde }),
      ...(filters.fechaHasta && { lte: filters.fechaHasta }),
    }

    const ventaWhere: Record<string, unknown> = {
      tenantId,
      ...(Object.keys(dateFilter).length > 0 && { fecha: dateFilter }),
      ...(filters.puntoVentaId && { puntoVentaId: filters.puntoVentaId }),
    }

    const [ventas, tenant] = await Promise.all([
      filters.fuente === "CONSULTORIO"
        ? Promise.resolve([])
        : this.db.venta.findMany({
            where: ventaWhere,
            select: {
              id: true,
              fecha: true,
              totalVenta: true,
              tipoPago: true,
              estadoPago: true,
              clienteNombre: true,
              puntoVentaId: true,
            },
          }),
      this.db.tenant.findUnique({ where: { id: tenantId }, select: { esConsultorio: true } }),
    ])

    const ventaDTOs: ReporteIngresoDTO[] = ventas.map((v: any) => ({
      id: v.id,
      fecha: v.fecha,
      monto: Number(v.totalVenta),
      tipoPago: v.tipoPago,
      estado: v.estadoPago,
      fuente: "VENTA" as const,
      clienteNombre: v.clienteNombre ?? null,
      puntoVentaId: v.puntoVentaId ?? null,
    }))

    let consultorioDTOs: ReporteIngresoDTO[] = []

    if (filters.fuente !== "VENTA" && tenant?.esConsultorio) {
      const consultorio = await this.db.consultorio.findFirst({
        where: { tenantId },
        select: { id: true },
      })

      if (consultorio) {
        const atencionesMedicas = await this.db.atencionMedica.findMany({
          where: {
            consultorioId: consultorio.id,
            ...(Object.keys(dateFilter).length > 0 && { fechaAtencion: dateFilter }),
          },
          include: { pagos: true },
          select: {
            id: true,
            fechaAtencion: true,
            estadoAtencion: true,
            pagos: true,
          },
        })

        consultorioDTOs = atencionesMedicas.flatMap((a: any) =>
          a.pagos.map((p: any) => ({
            id: p.id,
            fecha: a.fechaAtencion,
            monto: Number(p.monto),
            tipoPago: p.tipoPago ?? "OTRO",
            estado: a.estadoAtencion,
            fuente: "CONSULTORIO" as const,
            clienteNombre: null,
            puntoVentaId: null,
          })),
        )
      }
    }

    const merged = [...ventaDTOs, ...consultorioDTOs].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    )

    const total = merged.length
    const data = merged.slice(skip, skip + take)

    return { data, total }
  }
}
