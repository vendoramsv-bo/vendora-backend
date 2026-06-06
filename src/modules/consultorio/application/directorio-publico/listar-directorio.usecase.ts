import type { IConsultorioPublicoRepository, DirectorioParams, ConsultorioDirectorioItem } from "../../domain/ports/IConsultorioPublicoRepository.js"

export class ListarDirectorioConsultorioUseCase {
  constructor(private readonly repo: IConsultorioPublicoRepository) {}

  async ejecutar(params: DirectorioParams): Promise<{
    data: ConsultorioDirectorioItem[]
    total: number
    page: number
    take: number
    totalPaginas: number
    hayPaginaSiguiente: boolean
    hayPaginaAnterior: boolean
  }> {
    const page = Math.max(1, params.page ?? 1)
    const take = Math.min(100, Math.max(1, params.take ?? 20))

    const { data, total } = await this.repo.listarDirectorio({ ...params, page, take })
    const totalPaginas = Math.ceil(total / take)

    return {
      data,
      total,
      page,
      take,
      totalPaginas,
      hayPaginaSiguiente: page < totalPaginas,
      hayPaginaAnterior: page > 1,
    }
  }
}
