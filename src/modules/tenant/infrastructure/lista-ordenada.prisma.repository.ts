import type { IListaOrdenadaRepository, ParamsListaOrdenada } from "../domain/ports/IListaOrdenadaRepository.js"
import { ConflictoUnicidadConfiguracion } from "../domain/tenant.errors.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fila = any

/**
 * Base para descripciones, imágenes y equipo: mismas operaciones, distinto modelo
 * y distintos nombres de campo. Las subclases solo traducen contrato ↔ modelo.
 */
export abstract class ListaOrdenadaPrismaRepository<TItem, TCrear, TEditar>
  implements IListaOrdenadaRepository<TItem, TCrear, TEditar>
{
  protected abstract readonly modelo: string
  protected abstract readonly camposBusqueda: string[]
  protected abstract aItem(fila: Fila): TItem
  protected abstract aDatosCrear(datos: TCrear): Record<string, unknown>
  protected abstract aDatosEditar(datos: TEditar): Record<string, unknown>
  /** Mensaje para un choque de unicidad según los campos del índice (`meta.target`). */
  protected mensajeConflicto(_campos: string[]): string {
    return "Ya existe un elemento con esos datos"
  }

  constructor(protected readonly db: Db) {}

  private get delegate() {
    return this.db[this.modelo]
  }

  private where(tenantId: string, search?: string) {
    if (!search) return { tenantId }
    return {
      tenantId,
      OR: this.camposBusqueda.map((campo) => ({ [campo]: { contains: search, mode: "insensitive" } })),
    }
  }

  async listar(tenantId: string, { take, skip, search }: ParamsListaOrdenada) {
    const where = this.where(tenantId, search)
    const [filas, total] = await Promise.all([
      this.delegate.findMany({ where, take, skip, orderBy: [{ orden: "asc" }, { createdAt: "asc" }, { id: "asc" }] }),
      this.delegate.count({ where }),
    ])
    return { data: filas.map((f: Fila) => this.aItem(f)), total }
  }

  async buscar(tenantId: string, id: string) {
    const f = await this.delegate.findFirst({ where: { id, tenantId } })
    return f ? this.aItem(f) : null
  }

  async contar(tenantId: string) {
    return this.delegate.count({ where: { tenantId } })
  }

  async maxOrden(tenantId: string) {
    const r = await this.delegate.aggregate({ where: { tenantId }, _max: { orden: true } })
    return r._max.orden ?? -1
  }

  async crear(tenantId: string, datos: TCrear, orden: number) {
    return this.conUnicidad(async () =>
      this.aItem(await this.delegate.create({ data: { ...this.aDatosCrear(datos), tenantId, orden } })),
    )
  }

  async editar(tenantId: string, id: string, datos: TEditar) {
    return this.conUnicidad(async () => {
      await this.delegate.updateMany({ where: { id, tenantId }, data: this.aDatosEditar(datos) })
      return (await this.buscar(tenantId, id))!
    })
  }

  async borrar(tenantId: string, id: string) {
    await this.delegate.deleteMany({ where: { id, tenantId } })
  }

  async idsActuales(tenantId: string) {
    const filas = await this.delegate.findMany({ where: { tenantId }, select: { id: true } })
    return filas.map((f: { id: string }) => f.id)
  }

  async aplicarOrden(tenantId: string, ids: string[]) {
    await this.db.$transaction(
      ids.map((id, orden) => this.delegate.updateMany({ where: { id, tenantId }, data: { orden } })),
    )
  }

  private async conUnicidad<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      const e = err as { code?: string; meta?: { target?: string[] | string } }
      if (e?.code === "P2002") {
        const target = e.meta?.target
        const campos = Array.isArray(target) ? target : String(target ?? "").split(/[_,]/)
        throw new ConflictoUnicidadConfiguracion(this.mensajeConflicto(campos))
      }
      throw err
    }
  }
}

/** Quita las claves `undefined` para que un PATCH parcial no pise campos. */
export function sinUndefined(o: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
}
