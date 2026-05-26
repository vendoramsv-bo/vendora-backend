import type { IPublicacionRepository, MediaInput } from "../../domain/ports/IPublicacionRepository.js"
import { SoloPropietarioAdmin } from "../../domain/social.errors.js"

const ROLES_GESTION = ["PROPIETARIO", "owner", "ADMIN"]

export class CrearPublicacionUseCase {
  constructor(private readonly repo: IPublicacionRepository) {}

  async ejecutar(tenantId: string, autorId: string, rol: string, data: {
    titulo?: string
    contenido?: string
    tipo: string
    etiquetas: string[]
    medios: MediaInput[]
  }) {
    if (!ROLES_GESTION.includes(rol)) throw new SoloPropietarioAdmin()
    return this.repo.create({ tenantId, autorId, ...data })
  }
}
