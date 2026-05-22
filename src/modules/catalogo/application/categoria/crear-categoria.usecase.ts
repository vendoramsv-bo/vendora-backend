import type { ICategoriaRepository, CategoriaCreateDTO } from "../../domain/ports/ICategoriaRepository.js"
import type { IActividadEconomicaRepository } from "../../domain/ports/IActividadEconomicaRepository.js"
import type { CategoriaEntity } from "../../domain/categoria.entity.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { ActividadNoEncontrada, CategoriaNombreDuplicado, CategoriaPadreNoEncontrada } from "../../domain/catalogo.errors.js"

export class CrearCategoriaUseCase {
  constructor(
    private readonly repo: ICategoriaRepository,
    private readonly actividadRepo: IActividadEconomicaRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(data: Omit<CategoriaCreateDTO, "nivel">, tenantId: string, userId: string): Promise<CategoriaEntity> {
    const actividad = await this.actividadRepo.obtener(data.actividadId, tenantId)
    if (!actividad) throw new ActividadNoEncontrada(data.actividadId)

    let nivel = 1
    if (data.padreId) {
      const padre = await this.repo.obtener(data.padreId, tenantId)
      if (!padre) throw new CategoriaPadreNoEncontrada(data.padreId)
      nivel = padre.nivel + 1
    }

    const existentes = await this.repo.listar(tenantId, data.actividadId)
    const mismoNivel = existentes.filter((c) => (c.padreId ?? null) === (data.padreId ?? null))
    const duplicado = mismoNivel.some((c) => c.nombre.toLowerCase() === data.nombre.toLowerCase())
    if (duplicado) throw new CategoriaNombreDuplicado()

    const categoria = await this.repo.crear({ ...data, nivel }, tenantId, userId)

    this.notificador.categoriaCreada(tenantId, {
      tenantId,
      categoriaId: categoria.id,
      nombre: categoria.nombre,
      padreId: categoria.padreId ?? null,
      actividadId: categoria.actividadId,
    })

    return categoria
  }
}
