import type { IAtencionMedicaRepository, AtencionCreateDTO, PagoDTO } from "../domain/ports/IAtencionMedicaRepository.js"
import type { ListResult } from "../domain/ports/IMedicoRepository.js"
import { AtencionMedicaEntity, type AtencionMedicaRaw } from "../domain/atencion-medica.entity.js"
import { AtencionNoEncontrada } from "../domain/consultorio.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { withAudit } from "../../../core/prisma-scoped.js"

const INCLUDE_FULL = { detalle: true, pagos: true }

export class AtencionMedicaPrismaRepository implements IAtencionMedicaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async crear(data: AtencionCreateDTO, consultorioId: string, userId: string): Promise<AtencionMedicaEntity> {
    const { detalle, pacienteId, medicoId, citaId, tipoPago, observaciones } = data

    const [pacienteRaw, medicoRaw] = await Promise.all([
      this.client.paciente.findUnique({ where: { id: pacienteId }, select: { nombre: true, apellido: true, telefono: true } }) as Promise<{ nombre: string; apellido: string; telefono: string | null } | null>,
      this.client.medico.findUnique({ where: { id: medicoId }, select: { especialidad: true, member: { include: { user: { select: { name: true } } } } } }) as Promise<{ especialidad: string; member: { user: { name: string } } } | null>,
    ])

    const subtotal = detalle.reduce((s, d) => {
      const precio = d.precioUnitario ?? 0
      const qty = d.cantidad ?? 1
      const desc = d.descuento ?? 0
      return s + (precio * qty - desc)
    }, 0)

    const raw = await this.client.$transaction(async (tx: typeof this.client) => {
      const atencion = await tx.atencionMedica.create({
        data: withAudit({
          consultorioId,
          pacienteId,
          medicoId,
          citaId,
          tipoPago: tipoPago ?? "EFECTIVO",
          observaciones,
          pacienteNombre: pacienteRaw?.nombre ?? "",
          pacienteApellido: pacienteRaw?.apellido ?? "",
          pacienteTelefono: pacienteRaw?.telefono ?? null,
          medicoNombre: medicoRaw?.member?.user?.name ?? "",
          medicoEspecialidad: medicoRaw?.especialidad ?? "",
          totalServicios: detalle.length,
          totalCantidad: detalle.reduce((s, d) => s + (d.cantidad ?? 1), 0),
          subtotal,
          total: subtotal,
        }, userId),
      })

      if (detalle.length > 0) {
        type SrvRow = { id: string; nombre: string; especialidad: string | null }
        const servicios: SrvRow[] = await tx.servicioMedico.findMany({
          where: { id: { in: detalle.map((d) => d.servicioId) } },
          select: { id: true, nombre: true, especialidad: true },
        })
        const servicioMap = new Map<string, SrvRow>(servicios.map((s) => [s.id, s]))

        await tx.atencionDetalle.createMany({
          data: detalle.map((d) => {
            const srv = servicioMap.get(d.servicioId)
            const precio = d.precioUnitario ?? 0
            const qty = d.cantidad ?? 1
            const desc = d.descuento ?? 0
            return {
              atencionId: atencion.id,
              servicioId: d.servicioId,
              servicioNombre: srv?.nombre ?? "",
              especialidad: srv?.especialidad ?? "",
              tipoTratamiento: d.tipoTratamiento,
              descripcionTratamiento: d.descripcionTratamiento,
              referenciaClin: d.referenciaClin,
              cantidad: qty,
              precioUnitario: precio,
              descuento: desc,
              subtotal: precio * qty - desc,
              nota: d.nota,
            }
          }),
        })
      }

      return tx.atencionMedica.findUnique({ where: { id: atencion.id }, include: INCLUDE_FULL })
    })

    return AtencionMedicaEntity.fromPrisma(raw as AtencionMedicaRaw)
  }

  async obtener(id: string, consultorioId: string): Promise<AtencionMedicaEntity> {
    const raw = await this.client.atencionMedica.findFirst({ where: { id, consultorioId }, include: INCLUDE_FULL })
    if (!raw) throw new AtencionNoEncontrada(id)
    return AtencionMedicaEntity.fromPrisma(raw as AtencionMedicaRaw)
  }

  async listar(consultorioId: string, params: QueryParams): Promise<ListResult<AtencionMedicaEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["pacienteNombre", "medicoNombre"])
    const where = { consultorioId, ...whereSearch }
    const [items, total] = await Promise.all([
      this.client.atencionMedica.findMany({ where, take, skip, orderBy, include: INCLUDE_FULL }),
      this.client.atencionMedica.count({ where }),
    ])
    return { data: items.map((r: AtencionMedicaRaw) => AtencionMedicaEntity.fromPrisma(r)), total }
  }

  async registrarPago(atencionId: string, data: PagoDTO, userId: string): Promise<AtencionMedicaEntity> {
    const raw = await this.client.$transaction(async (tx: typeof this.client) => {
      await tx.atencionPago.create({ data: { atencionId, ...data } })

      const pagos = await tx.atencionPago.findMany({ where: { atencionId }, select: { monto: true } })
      const atencion = await tx.atencionMedica.findUnique({ where: { id: atencionId }, select: { total: true } })
      const totalPagado = pagos.reduce((s: number, p: { monto: unknown }) => s + Number(p.monto), 0)
      const total = Number(atencion?.total ?? 0)

      let estadoPago = "PENDIENTE"
      let estado = "EN_CURSO"
      if (totalPagado >= total) {
        estadoPago = "PAGADO"
        estado = "PAGADA"
      } else if (totalPagado > 0) {
        estadoPago = "PARCIAL"
        estado = "COMPLETADA"
      }

      return tx.atencionMedica.update({
        where: { id: atencionId },
        data: { estadoPago, estado, updatedById: userId },
        include: INCLUDE_FULL,
      })
    })

    return AtencionMedicaEntity.fromPrisma(raw as AtencionMedicaRaw)
  }

  async actualizarEstado(id: string, estado: string, estadoPago: string, userId: string): Promise<AtencionMedicaEntity> {
    const raw = await this.client.atencionMedica.update({
      where: { id },
      data: { estado, estadoPago, updatedById: userId },
      include: INCLUDE_FULL,
    })
    return AtencionMedicaEntity.fromPrisma(raw as AtencionMedicaRaw)
  }
}
