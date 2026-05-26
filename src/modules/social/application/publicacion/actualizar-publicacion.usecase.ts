import type { IPublicacionRepository, MediaInput } from "../../domain/ports/IPublicacionRepository.js"
import { PublicacionEntity } from "../../domain/publicacion.entity.js"
import { PublicacionNoEncontrada, SoloPropietarioAdmin } from "../../domain/social.errors.js"

const ROLES_GESTION = ["PROPIETARIO", "owner", "ADMIN"]

export class ActualizarPublicacionUseCase {
  constructor(private readonly repo: IPublicacionRepository) {}

  async ejecutar(id: string, tenantId: string, rol: string, data: {
    titulo?: string
    contenido?: string
    tipo?: string
    etiquetas?: string[]
    medios?: MediaInput[]
  }) {
    if (!ROLES_GESTION.includes(rol)) throw new SoloPropietarioAdmin()

    const raw = await this.repo.findById(id, tenantId)
    if (!raw) throw new PublicacionNoEncontrada(id)

    const publicacion = PublicacionEntity.fromPrisma(raw)
    if (!publicacion.esBorrador()) {
      throw new PublicacionNoEncontrada(id)
    }

    return this.repo.update(id, tenantId, data)
  }
}
