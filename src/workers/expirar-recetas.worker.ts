import { Worker } from "bullmq"
import { prisma } from "../modules/autenticacion/infrastructure/better-auth.setup.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export const expirarRecetasWorker = new Worker(
  "expirar-recetas",
  async () => {
    const result = await db.recetaMedica.updateMany({
      where: {
        fechaVencimiento: { lt: new Date() },
        estado: { in: ["EMITIDA", "PARCIAL"] },
      },
      data: { estado: "VENCIDA" },
    })
    logger.info({ count: result.count }, "[expirar-recetas] Recetas vencidas actualizadas")
  },
  {
    connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379", enableReadyCheck: false, maxRetriesPerRequest: null },
    concurrency: 1,
  },
)

expirarRecetasWorker.on("error", (err) => logger.warn({ err }, "[expirar-recetas] error de conexión Redis"))
expirarRecetasWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "[expirar-recetas] Job fallido")
})
