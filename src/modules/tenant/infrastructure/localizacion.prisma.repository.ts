import type { ILocalizacionRepository, LocalizacionItem, DatosLocalizacion } from "../domain/ports/ILocalizacionRepository.js"
import { sinUndefined, type Db, type Fila } from "./lista-ordenada.prisma.repository.js"

export class LocalizacionPrismaRepository implements ILocalizacionRepository {
  constructor(private readonly db: Db) {}

  async listar(tenantId: string, { take, skip, search }: { take: number; skip: number; search?: string }) {
    const where = search
      ? {
          tenantId,
          OR: ["direccion", "ciudad", "barrio"].map((c) => ({ [c]: { contains: search, mode: "insensitive" } })),
        }
      : { tenantId }
    const [filas, total] = await Promise.all([
      this.db.localizacion.findMany({ where, take, skip, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      this.db.localizacion.count({ where }),
    ])
    return { data: filas.map(aItem), total }
  }

  async buscar(tenantId: string, id: string) {
    const f = await this.db.localizacion.findFirst({ where: { id, tenantId } })
    return f ? aItem(f) : null
  }

  async contar(tenantId: string) {
    return this.db.localizacion.count({ where: { tenantId } })
  }

  async crear(tenantId: string, datos: DatosLocalizacion) {
    return aItem(await this.db.localizacion.create({ data: { ...datos, barrio: datos.barrio ?? null, tenantId } }))
  }

  async editar(tenantId: string, id: string, datos: Partial<DatosLocalizacion>) {
    await this.db.localizacion.updateMany({ where: { id, tenantId }, data: sinUndefined({ ...datos }) })
    return (await this.buscar(tenantId, id))!
  }

  async borrar(tenantId: string, id: string) {
    await this.db.localizacion.deleteMany({ where: { id, tenantId } })
  }
}

function aItem(f: Fila): LocalizacionItem {
  return {
    id: f.id,
    latitud: f.latitud,
    longitud: f.longitud,
    direccion: f.direccion,
    ...(f.barrio ? { barrio: f.barrio } : {}),
    ciudad: f.ciudad,
    departamento: f.departamento,
    createdAt: new Date(f.createdAt).toISOString(),
  }
}
