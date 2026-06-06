import { paginate } from "../../../../core/query-params.js"
import type { IConsultorioPublicoRepository, DirectorioParams } from "../../domain/ports/IConsultorioPublicoRepository.js"

export class ListarDirectorioConsultorioUseCase {
  constructor(private readonly repo: IConsultorioPublicoRepository) {}

  async ejecutar(params: DirectorioParams) {
    const take = Math.min(100, Math.max(1, params.take ?? 20))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take

    const { data, total } = await this.repo.listarDirectorio({ ...params, page, take })
    return paginate(data, total, { take, skip })
  }
}
