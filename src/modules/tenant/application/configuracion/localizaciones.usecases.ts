import type { ILocalizacionRepository, DatosLocalizacion } from "../../domain/ports/ILocalizacionRepository.js"
import { RecursoConfiguracionNoEncontrado, UltimaLocalizacionError } from "../../domain/tenant.errors.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarLocalizacionesUseCase {
  constructor(private readonly repo: ILocalizacionRepository) {}
  async ejecutar(tenantId: string, params: { take: number; skip: number; search?: string }) {
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate(data, total, params)
  }
}

export class CrearLocalizacionUseCase {
  constructor(private readonly repo: ILocalizacionRepository) {}
  ejecutar(tenantId: string, datos: DatosLocalizacion) {
    return this.repo.crear(tenantId, datos)
  }
}

export class EditarLocalizacionUseCase {
  constructor(private readonly repo: ILocalizacionRepository) {}
  async ejecutar(tenantId: string, id: string, datos: Partial<DatosLocalizacion>) {
    if (!(await this.repo.buscar(tenantId, id))) throw new RecursoConfiguracionNoEncontrado("Localización")
    return this.repo.editar(tenantId, id, datos)
  }
}

export class BorrarLocalizacionUseCase {
  constructor(private readonly repo: ILocalizacionRepository) {}
  async ejecutar(tenantId: string, id: string) {
    if (!(await this.repo.buscar(tenantId, id))) throw new RecursoConfiguracionNoEncontrado("Localización")
    // El directorio público ubica al negocio por su localización.
    if ((await this.repo.contar(tenantId)) <= 1) throw new UltimaLocalizacionError()
    await this.repo.borrar(tenantId, id)
  }
}
