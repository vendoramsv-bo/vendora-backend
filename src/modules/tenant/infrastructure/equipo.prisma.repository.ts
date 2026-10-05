import { ListaOrdenadaPrismaRepository, sinUndefined, type Fila } from "./lista-ordenada.prisma.repository.js"

export interface MiembroEquipoItem {
  id: string
  nombre: string
  cargo: string
  telefono?: string
  domicilio?: string
  fotoUrl?: string
  orden: number
  createdAt: string
}

type Datos = { nombre: string; cargo: string; telefono?: string; domicilio?: string; fotoUrl?: string }

// "" del formulario → null: dos miembros sin teléfono no chocan con @@unique([tenantId, telefono]).
const vacioANull = (v: string | undefined) => (v === undefined ? undefined : v.trim() === "" ? null : v)

export class EquipoPrismaRepository extends ListaOrdenadaPrismaRepository<MiembroEquipoItem, Datos, Partial<Datos>> {
  protected readonly modelo = "equipoDeTrabajo"
  protected readonly camposBusqueda = ["nombres", "cargo"]

  protected aItem(f: Fila): MiembroEquipoItem {
    return {
      id: f.id,
      nombre: f.nombres,
      cargo: f.cargo,
      ...(f.telefono ? { telefono: f.telefono } : {}),
      ...(f.domicilio ? { domicilio: f.domicilio } : {}),
      ...(f.imagenUrl ? { fotoUrl: f.imagenUrl } : {}),
      orden: f.orden,
      createdAt: new Date(f.createdAt).toISOString(),
    }
  }

  protected aDatosCrear(d: Datos) {
    return {
      nombres: d.nombre,
      cargo: d.cargo,
      telefono: vacioANull(d.telefono) ?? null,
      domicilio: vacioANull(d.domicilio) ?? null,
      imagenUrl: vacioANull(d.fotoUrl) ?? null,
    }
  }

  protected aDatosEditar(d: Partial<Datos>) {
    return sinUndefined({
      nombres: d.nombre,
      cargo: d.cargo,
      telefono: vacioANull(d.telefono),
      domicilio: vacioANull(d.domicilio),
      imagenUrl: vacioANull(d.fotoUrl),
    })
  }

  protected mensajeConflicto(campos: string[]) {
    if (campos.includes("telefono")) return "Ya hay un miembro del equipo con ese teléfono"
    if (campos.includes("nombres")) return "Ya hay un miembro del equipo con ese nombre"
    return "Ya hay un miembro del equipo con esos datos"
  }
}
