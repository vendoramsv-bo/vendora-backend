import type { IListaOrdenadaRepository, ParamsListaOrdenada } from "../../domain/ports/IListaOrdenadaRepository.js"
import { LIMITE_LISTA, validarReordenamiento } from "../../domain/lista-ordenada.js"
import { LimiteListaAlcanzadoError, RecursoConfiguracionNoEncontrado } from "../../domain/tenant.errors.js"
import { paginate } from "../../../../core/query-params.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Repo<TItem, TCrear = any, TEditar = any> = IListaOrdenadaRepository<TItem, TCrear, TEditar>

export class ListarElementosUseCase<TItem> {
  constructor(private readonly repo: Repo<TItem>) {}

  async ejecutar(tenantId: string, params: ParamsListaOrdenada) {
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate(data, total, params)
  }
}

export class CrearElementoUseCase<TItem, TCrear> {
  constructor(private readonly repo: Repo<TItem, TCrear>) {}

  async ejecutar(tenantId: string, datos: TCrear): Promise<TItem> {
    if ((await this.repo.contar(tenantId)) >= LIMITE_LISTA) throw new LimiteListaAlcanzadoError(LIMITE_LISTA)
    return this.repo.crear(tenantId, datos, (await this.repo.maxOrden(tenantId)) + 1)
  }
}

export class EditarElementoUseCase<TItem, TEditar> {
  constructor(private readonly repo: Repo<TItem, unknown, TEditar>, private readonly recurso = "Elemento") {}

  async ejecutar(tenantId: string, id: string, datos: TEditar): Promise<TItem> {
    if (!(await this.repo.buscar(tenantId, id))) throw new RecursoConfiguracionNoEncontrado(this.recurso)
    return this.repo.editar(tenantId, id, datos)
  }
}

export class BorrarElementoUseCase<TItem> {
  constructor(private readonly repo: Repo<TItem>, private readonly recurso = "Elemento") {}

  async ejecutar(tenantId: string, id: string): Promise<void> {
    if (!(await this.repo.buscar(tenantId, id))) throw new RecursoConfiguracionNoEncontrado(this.recurso)
    await this.repo.borrar(tenantId, id)
  }
}

export class ReordenarElementosUseCase<TItem> {
  constructor(private readonly repo: Repo<TItem>) {}

  async ejecutar(tenantId: string, ids: string[]) {
    validarReordenamiento(await this.repo.idsActuales(tenantId), ids)
    await this.repo.aplicarOrden(tenantId, ids)
    const params = { take: LIMITE_LISTA, skip: 0 }
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate(data, total, params)
  }
}
