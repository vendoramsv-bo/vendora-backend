import { Queue } from "bullmq"

export const recordatoriosQueue = new Queue("recordatorios", {
  connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: 500 },
})
