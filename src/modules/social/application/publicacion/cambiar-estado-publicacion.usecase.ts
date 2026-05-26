import type { IPublicacionRepository } from "../../domain/ports/IPublicacionRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"
import { PublicacionEntity } from "../../domain/publicacion.entity.js"
import { PublicacionNoEncontrada, SoloPropietarioAdmin } from "../../domain/social.errors.js"

const ROLES_GESTION = ["PROPIETARIO", "owner", "ADMIN"]

export class CambiarEstadoPublicacionUseCase {
  constructor(
    private readonly repo: IPublicacionRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(id: string, tenantId: string, rol: string, nuevoEstado: string) {
    if (!ROLES_GESTION.includes(rol)) throw new SoloPropietarioAdmin()

    const raw = await this.repo.findById(id, tenantId)
    if (!raw) throw new PublicacionNoEncontrada(id)

    const publicacion = PublicacionEntity.fromPrisma(raw)
    publicacion.validarTransicion(nuevoEstado)

    const publicadoEn = nuevoEstado === "PUBLICADO" ? new Date() : undefined
    const updated = await this.repo.cambiarEstado(id, nuevoEstado, publicadoEn)

    if (nuevoEstado === "PUBLICADO") {
      this.notificador.publicacionNueva(tenantId, {
        tenantId,
        publicacionId: id,
        titulo: raw.titulo ?? undefined,
        tipo: raw.tipo,
        etiquetas: raw.etiquetas,
        fecha: new Date().toISOString(),
      })
    }

    return updated
  }
}
