import { ListaOrdenadaPrismaRepository, type Fila } from "./lista-ordenada.prisma.repository.js"

export interface ImagenLocalItem {
  id: string
  url: string
  descripcion?: string
  orden: number
  createdAt: string
}

type Datos = { url: string; descripcion?: string }

export class ImagenLocalPrismaRepository extends ListaOrdenadaPrismaRepository<ImagenLocalItem, Datos, never> {
  protected readonly modelo = "imagen"
  protected readonly camposBusqueda = ["descripcion"]

  protected aItem(f: Fila): ImagenLocalItem {
    return {
      id: f.id,
      url: f.imagenUrl,
      ...(f.descripcion ? { descripcion: f.descripcion } : {}),
      orden: f.orden,
      createdAt: new Date(f.createdAt).toISOString(),
    }
  }

  // El modelo exige descripción; la pantalla la deja opcional.
  protected aDatosCrear(d: Datos) {
    return { imagenUrl: d.url, descripcion: d.descripcion ?? "" }
  }

  protected aDatosEditar(): Record<string, unknown> {
    return {}
  }

  protected mensajeConflicto() {
    return "Esa imagen ya está cargada en el negocio"
  }
}
