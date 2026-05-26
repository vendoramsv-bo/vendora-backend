import type { IPublicacionRRSSRepository } from "../../domain/ports/IPublicacionRRSSRepository.js"
import type { IMenuItemRepository } from "../../domain/ports/IMenuItemRepository.js"
import type { IImagenGeneradorService } from "../../domain/ports/IImagenGeneradorService.js"
import { PublicacionNoEncontrada } from "../../domain/restaurante.errors.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class EjecutarPublicacionUseCase {
  constructor(
    private readonly pubRepo: IPublicacionRRSSRepository,
    private readonly menuItemRepo: IMenuItemRepository,
    private readonly imagenGenerador: IImagenGeneradorService,
  ) {}

  async ejecutar(publicacionId: string, userId: string): Promise<void> {
    const pub = await this.pubRepo.findById(publicacionId)
    if (!pub) throw new PublicacionNoEncontrada(publicacionId)

    await this.pubRepo.update(publicacionId, { estado: "PUBLICANDO" }, userId)

    try {
      const items = await this.menuItemRepo.findAllByMenu(pub.menuId)
      const itemsParaImagen = items.map((i) => ({
        nombre: i.nombreSnapshot,
        precio: i.precio,
        descripcion: i.descripcionSnapshot,
        imagen: i.imagenSnapshot,
      }))

      const pngBuffer = await this.imagenGenerador.generarMenuPNG(pub.menuId, itemsParaImagen)

      // TODO: Upload PNG to storage and call Meta Graph API
      // For now, log and mark as published with placeholder URL
      logger.info({ publicacionId, redSocial: pub.redSocial, pngSize: pngBuffer.length }, "[rrss] imagen generada, publicación pendiente de integración Meta Graph API")

      await this.pubRepo.update(
        publicacionId,
        { estado: "PUBLICADA", fechaPublicada: new Date() },
        userId,
      )
    } catch (err) {
      const errorMensaje = err instanceof Error ? err.message : String(err)
      logger.error({ publicacionId, errorMensaje }, "[rrss] error al publicar")
      await this.pubRepo.update(publicacionId, { estado: "FALLIDA", errorMensaje }, userId).catch(() => null)
    }
  }
}
