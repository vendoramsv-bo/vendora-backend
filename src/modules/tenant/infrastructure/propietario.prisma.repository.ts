import type { IPropietarioRepository, PropietarioItem, DatosPropietario } from "../domain/ports/IPropietarioRepository.js"
import { ConflictoUnicidadConfiguracion } from "../domain/tenant.errors.js"
import { sinUndefined, type Db, type Fila } from "./lista-ordenada.prisma.repository.js"

export class PropietarioPrismaRepository implements IPropietarioRepository {
  constructor(private readonly db: Db) {}

  async delNegocio(tenantId: string) {
    const f = await this.db.propietario.findUnique({ where: { tenantId } })
    return f ? aItem(f) : null
  }

  async editar(tenantId: string, id: string, d: Partial<DatosPropietario>, actorUserId: string) {
    try {
      await this.db.propietario.updateMany({
        where: { id, tenantId },
        data: {
          ...sinUndefined({
            nombres: d.nombre,
            telefono: d.telefono,
            domicilio: d.domicilio,
            nombreReferencia: d.referenciaNombre,
            telefonoReferencia: d.referenciaTelefono,
          }),
          updatedById: actorUserId,
        },
      })
    } catch (err) {
      if ((err as { code?: string })?.code === "P2002") {
        throw new ConflictoUnicidadConfiguracion("Ese nombre o teléfono ya está en uso en el negocio")
      }
      throw err
    }
    return (await this.delNegocio(tenantId))!
  }
}

// Los campos de texto se crean vacíos (hook de alta y backfill): vacío → ausente.
function aItem(f: Fila): PropietarioItem {
  return {
    id: f.id,
    nombre: f.nombres,
    telefono: f.telefono,
    ...(f.domicilio ? { domicilio: f.domicilio } : {}),
    ...(f.nombreReferencia ? { referenciaNombre: f.nombreReferencia } : {}),
    ...(f.telefonoReferencia ? { referenciaTelefono: f.telefonoReferencia } : {}),
    createdAt: new Date(f.createdAt).toISOString(),
  }
}
