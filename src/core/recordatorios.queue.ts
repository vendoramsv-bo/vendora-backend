import { Queue } from "bullmq"

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
}
const defaultJobOptions = { removeOnComplete: 100, removeOnFail: 500 }

export const recordatoriosQueue = new Queue("recordatorios", { connection, defaultJobOptions })
recordatoriosQueue.on("error", () => { /* handled by BullMQ internals */ })

export const expirarRecetasQueue = new Queue("expirar-recetas", { connection, defaultJobOptions })
expirarRecetasQueue.on("error", () => { /* handled by BullMQ internals */ })
