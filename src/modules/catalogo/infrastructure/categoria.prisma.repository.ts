import type { ICategoriaRepository, CategoriaCreateDTO, CategoriaUpdateDTO } from "../domain/ports/ICategoriaRepository.js"
import { CategoriaEntity, type CategoriaRaw } from "../domain/categoria.entity.js"
import { withAudit } from "../../../core/prisma-scoped.js"

export class CategoriaPrismaRepository implements ICategoriaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async listar(tenantId: string, actividadId?: string, estado?: string): Promise<CategoriaEntity[]> {
    const where: Record<string, unknown> = { tenantId }
    if (actividadId) where["actividadId"] = actividadId
    if (estado) where["estado"] = estado
    const rows = await this.db.categoria.findMany({ where, orderBy: [{ nivel: "asc" }, { nombre: "asc" }] })
    return rows.map((r: CategoriaRaw) => CategoriaEntity.fromPrisma(r))
  }

  async crear(data: CategoriaCreateDTO, tenantId: string, userId: string): Promise<CategoriaEntity> {
    const raw = await this.db.categoria.create({
      data: withAudit({ ...data, tenantId }, userId),
    })
    return CategoriaEntity.fromPrisma(raw as CategoriaRaw)
  }

  async obtener(id: string, tenantId: string): Promise<CategoriaEntity | null> {
    const raw = await this.db.categoria.findFirst({ where: { id, tenantId } })
    if (!raw) return null
    return CategoriaEntity.fromPrisma(raw as CategoriaRaw)
  }

  async actualizar(id: string, data: CategoriaUpdateDTO, userId: string): Promise<CategoriaEntity> {
    const raw = await this.db.categoria.update({
      where: { id },
      data: { ...data, updatedById: userId },
    })
    return CategoriaEntity.fromPrisma(raw as CategoriaRaw)
  }

  async desactivarConCascada(id: string, userId: string): Promise<void> {
    const todosIds: string[] = [id]
    const cola: string[] = [id]

    while (cola.length > 0) {
      const padreId = cola.shift()!
      const hijos = await this.db.categoria.findMany({
        where: { padreId },
        select: { id: true },
      })
      for (const h of hijos) {
        todosIds.push(h.id)
        cola.push(h.id)
      }
    }

    await this.db.$transaction([
      this.db.categoria.updateMany({
        where: { id: { in: todosIds } },
        data: { estado: "INACTIVO", updatedById: userId },
      }),
    ])
  }
}
