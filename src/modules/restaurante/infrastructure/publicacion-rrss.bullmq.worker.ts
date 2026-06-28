import { Worker } from "bullmq"
import { PublicacionRRSSPrismaRepository } from "./publicacion-rrss.prisma.repository.js"
import { MenuItemPrismaRepository } from "./menu-item.prisma.repository.js"
import { ImagenSatoriGenerador } from "./imagen.satori.generador.js"
import { EjecutarPublicacionUseCase } from "../application/publicacion-rrss/ejecutar-publicacion.usecase.js"
import type { RRSSJobData } from "./restaurante-rrss.queue.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export const restauranteRRSSWorker = new Worker<RRSSJobData>(
  "restaurante-rrss",
  async (job) => {
    const { publicacionId } = job.data
    logger.info({ publicacionId, jobId: job.id }, "[rrss-worker] procesando publicación")

    await new EjecutarPublicacionUseCase(
      new PublicacionRRSSPrismaRepository(),
      new MenuItemPrismaRepository(),
      new ImagenSatoriGenerador(),
    ).ejecutar(publicacionId, "SISTEMA")
  },
  {
    connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379", enableReadyCheck: false, maxRetriesPerRequest: null },
    concurrency: 2,
  },
)

restauranteRRSSWorker.on("error", (err) => logger.warn({ err }, "[rrss-worker] error de conexión Redis"))
restauranteRRSSWorker.on("completed", (job) => {
  logger.info({ publicacionId: job.data.publicacionId, jobId: job.id }, "[rrss-worker] publicación completada")
})

restauranteRRSSWorker.on("failed", (job, err) => {
  logger.error({ publicacionId: job?.data.publicacionId, jobId: job?.id, err }, "[rrss-worker] error al publicar")
})
