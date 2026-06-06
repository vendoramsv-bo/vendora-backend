import type { IConsultorioPublicoRepository, ServiciosParams } from "../../domain/ports/IConsultorioPublicoRepository.js"

export class ListarServiciosPublicosUseCase {
  constructor(private readonly repo: IConsultorioPublicoRepository) {}

  async ejecutar(slug: string, params: ServiciosParams): Promise<{
    data: { id: string; nombre: string; descripcion: string | null; especialidad: string | null; duracionMin: number; precio?: number }[]
    total: number
    page: number
    take: number
    totalPaginas: number
    hayPaginaSiguiente: boolean
    hayPaginaAnterior: boolean
  }> {
    const { consultorioId } = await this.repo.resolveConsultorioInfo(slug)
    const page = Math.max(1, params.page ?? 1)
    const take = Math.min(100, Math.max(1, params.take ?? 20))

    const { data, total } = await this.repo.listarServiciosPublicos(consultorioId, { ...params, page, take })
    const totalPaginas = Math.ceil(total / take)

    const mapped = data.map(s => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      especialidad: s.especialidad,
      duracionMin: s.duracionMin,
      ...(s.mostrarPrecio ? { precio: Number(s.precioBase) } : {}),
    }))

    return {
      data: mapped,
      total,
      page,
      take,
      totalPaginas,
      hayPaginaSiguiente: page < totalPaginas,
      hayPaginaAnterior: page > 1,
    }
  }
}
