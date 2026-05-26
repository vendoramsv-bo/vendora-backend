import type { IImagenGeneradorService, MenuItemParaImagen } from "../domain/ports/IImagenGeneradorService.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// Stub implementation — requires `satori` and `@resvg/resvg-js` (T002)
// Install with: pnpm add satori @resvg/resvg-js
// Then replace this stub with the real SVG→PNG pipeline
export class ImagenSatoriGenerador implements IImagenGeneradorService {
  async generarMenuPNG(menuId: string, items: MenuItemParaImagen[]): Promise<Buffer> {
    logger.warn({ menuId, itemCount: items.length }, "[imagen] satori not installed — returning placeholder PNG")

    // 1×1 transparent PNG placeholder
    const PNG_HEADER = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
      "0000000a49444154789c6260000000000200e221bc330000000049454e44ae426082",
      "hex",
    )
    return PNG_HEADER
  }
}
