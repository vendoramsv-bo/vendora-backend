import type { IRestaurantePublicoRepository } from "../../domain/ports/IRestaurantePublicoRepository.js"
import { PerfilNoEncontradoError } from "../../domain/restaurante-publico.errors.js"
import { prismaBase } from "../../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export interface ListarMenusPublicosParams {
  tiempoComida?: string
  fecha?: string
  take?: number
  page?: number
}

export class ListarMenusPublicosUseCase {
  constructor(private readonly repo: IRestaurantePublicoRepository) {}

  async ejecutar(slug: string, params: ListarMenusPublicosParams): Promise<unknown> {
    const tenant = await db.tenant.findFirst({ where: { slug, esRestaurante: true }, select: { id: true } })
    if (!tenant) throw new PerfilNoEncontradoError(slug)

    const restaurante = await db.restaurante.findUnique({ where: { tenantId: tenant.id }, select: { id: true } })
    if (!restaurante) throw new PerfilNoEncontradoError(slug)

    return this.repo.listarMenusPublicos({ restauranteId: restaurante.id, ...params })
  }
}
