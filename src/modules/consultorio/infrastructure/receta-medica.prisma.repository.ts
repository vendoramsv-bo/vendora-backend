import type { IRecetaMedicaRepository, RecetaCreateDTO } from "../domain/ports/IRecetaMedicaRepository.js"
import type { ListResult } from "../domain/ports/IMedicoRepository.js"
import { RecetaMedicaEntity, type RecetaMedicaRaw } from "../domain/receta-medica.entity.js"
import { RecetaNoEncontrada } from "../domain/consultorio.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { withAudit } from "../../../core/prisma-scoped.js"
import type { AuditoriaAccesoPrismaRepository } from "./auditoria-acceso.prisma.repository.js"

const INCLUDE_FULL = { detalle: true }

export class RecetaMedicaPrismaRepository implements IRecetaMedicaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(
    private readonly db: any,
    private readonly auditoriaRepo?: AuditoriaAccesoPrismaRepository,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async ultimaReceta(consultorioId: string): Promise<{ numeroReceta: string } | null> {
    return this.client.recetaMedica.findFirst({
      where: { consultorioId },
      orderBy: { createdAt: "desc" },
      select: { numeroReceta: true },
    })
  }

  async crear(data: RecetaCreateDTO, consultorioId: string, userId: string): Promise<RecetaMedicaEntity> {
    const { detalle, atencionId, pacienteId, medicoId, indicacionesGenerales, diagnosticoCie10, fechaVencimiento, observaciones } = data

    const [paciente, medico] = await Promise.all([
      this.client.paciente.findUnique({ where: { id: pacienteId }, select: { nombre: true, apellido: true } }) as Promise<{ nombre: string; apellido: string } | null>,
      this.client.medico.findUnique({ where: { id: medicoId }, select: { especialidad: true, nroRegistro: true, member: { include: { user: { select: { name: true } } } } } }) as Promise<{ especialidad: string; nroRegistro: string | null; member: { user: { name: string } } } | null>,
    ])

    const ultima = await this.ultimaReceta(consultorioId)
    const year = new Date().getFullYear()
    let seq = 1
    if (ultima) {
      const parts = ultima.numeroReceta.split("-")
      const lastYear = parseInt(parts[1] ?? "0", 10)
      const lastSeq = parseInt(parts[2] ?? "0", 10)
      seq = lastYear === year ? lastSeq + 1 : 1
    }
    const numeroReceta = `REC-${year}-${String(seq).padStart(5, "0")}`

    const vencimiento = fechaVencimiento ?? new Date(Date.now() + 30 * 24 * 60 * 60_000)

    const raw = await this.client.$transaction(async (tx: typeof this.client) => {
      const receta = await tx.recetaMedica.create({
        data: withAudit({
          consultorioId,
          atencionId,
          pacienteId,
          medicoId,
          numeroReceta,
          indicacionesGenerales,
          diagnosticoCie10,
          fechaVencimiento: vencimiento,
          observaciones,
          pacienteNombre: paciente?.nombre ?? "",
          pacienteApellido: paciente?.apellido ?? "",
          medicoNombre: medico?.member?.user?.name ?? "",
          medicoEspecialidad: medico?.especialidad ?? "",
          medicoRegistro: medico?.nroRegistro ?? null,
        }, userId),
      })

      if (detalle.length > 0) {
        await tx.recetaMedicaDetalle.createMany({
          data: detalle.map((d) => ({
            recetaId: receta.id,
            productoId: d.productoId ?? null,
            medicamento: d.medicamento,
            principioActivo: d.principioActivo ?? null,
            concentracion: d.concentracion ?? null,
            presentacion: d.presentacion ?? null,
            dosis: d.dosis,
            frecuencia: d.frecuencia,
            duracion: d.duracion,
            via: d.via ?? "ORAL",
            cantidadPrescrita: d.cantidadPrescrita ?? 1,
            indicaciones: d.indicaciones ?? null,
            permiteSustitucion: d.permiteSustitucion ?? true,
          })),
        })
      }

      return tx.recetaMedica.findUnique({ where: { id: receta.id }, include: INCLUDE_FULL })
    })

    return RecetaMedicaEntity.fromPrisma(raw as RecetaMedicaRaw)
  }

  async obtener(id: string, consultorioId: string, userId?: string, tenantId?: string): Promise<RecetaMedicaEntity> {
    const raw = await this.client.recetaMedica.findFirst({ where: { id, consultorioId }, include: INCLUDE_FULL })
    if (!raw) throw new RecetaNoEncontrada(id)
    if (this.auditoriaRepo && userId && tenantId) {
      void this.auditoriaRepo.registrar({
        tenantId,
        consultorioId,
        userId,
        accion: "LEER_RECETA",
        recursoTipo: "RECETA_MEDICA",
        recursoId: id,
      })
    }
    return RecetaMedicaEntity.fromPrisma(raw as RecetaMedicaRaw)
  }

  async listar(consultorioId: string, params: QueryParams): Promise<ListResult<RecetaMedicaEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["numeroReceta", "pacienteNombre"])
    const where = { consultorioId, ...whereSearch }
    const [items, total] = await Promise.all([
      this.client.recetaMedica.findMany({ where, take, skip, orderBy, include: INCLUDE_FULL }),
      this.client.recetaMedica.count({ where }),
    ])
    return { data: items.map((r: RecetaMedicaRaw) => RecetaMedicaEntity.fromPrisma(r)), total }
  }

  async anular(id: string, userId: string): Promise<RecetaMedicaEntity> {
    const raw = await this.client.recetaMedica.update({
      where: { id },
      data: { estado: "ANULADA", updatedById: userId },
      include: INCLUDE_FULL,
    })
    return RecetaMedicaEntity.fromPrisma(raw as RecetaMedicaRaw)
  }
}
