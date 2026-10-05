import { ListaOrdenadaPrismaRepository, sinUndefined, type Fila } from "./lista-ordenada.prisma.repository.js"

export interface DescripcionItem {
  id: string
  contenido: string
  orden: number
  createdAt: string
}

type Datos = { contenido: string }

export class DescripcionPrismaRepository extends ListaOrdenadaPrismaRepository<DescripcionItem, Datos, Partial<Datos>> {
  protected readonly modelo = "descripcion"
  protected readonly camposBusqueda = ["descripcion"]

  protected aItem(f: Fila): DescripcionItem {
    return { id: f.id, contenido: f.descripcion, orden: f.orden, createdAt: new Date(f.createdAt).toISOString() }
  }

  protected aDatosCrear(d: Datos) {
    return { descripcion: d.contenido }
  }

  protected aDatosEditar(d: Partial<Datos>) {
    return sinUndefined({ descripcion: d.contenido })
  }
}
