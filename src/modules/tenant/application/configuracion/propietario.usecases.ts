import type { IPropietarioRepository, DatosPropietario } from "../../domain/ports/IPropietarioRepository.js"
import { RecursoConfiguracionNoEncontrado } from "../../domain/tenant.errors.js"
import { paginate } from "../../../../core/query-params.js"

// Se responde como lista (0 o 1 elemento) para que la pantalla actual, que lo
// trata como lista, funcione mientras pasa a ser un formulario.
export class ObtenerPropietarioUseCase {
  constructor(private readonly repo: IPropietarioRepository) {}
  async ejecutar(tenantId: string) {
    const p = await this.repo.delNegocio(tenantId)
    const data = p ? [p] : []
    return paginate(data, data.length, { take: 1, skip: 0 })
  }
}

export class EditarPropietarioUseCase {
  constructor(private readonly repo: IPropietarioRepository) {}
  async ejecutar(tenantId: string, id: string, datos: Partial<DatosPropietario>, actorUserId: string) {
    const actual = await this.repo.delNegocio(tenantId)
    if (!actual || actual.id !== id) throw new RecursoConfiguracionNoEncontrado("Propietario")
    return this.repo.editar(tenantId, id, datos, actorUserId)
  }
}
