import { Queue } from "bullmq"

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
}

export const restauranteRRSSQueue = new Queue("restaurante-rrss", {
  connection,
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: 500 },
})
restauranteRRSSQueue.on("error", () => { /* handled by BullMQ internals */ })

export interface RRSSJobData {
  publicacionId: string
  restauranteId: string
  tenantId: string
}
