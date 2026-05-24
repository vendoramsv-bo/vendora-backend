import { Worker } from "bullmq"
import { prisma } from "../modules/autenticacion/infrastructure/better-auth.setup.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export const recordatorioCitaWorker = new Worker(
  "recordatorios",
  async (job) => {
    const { citaId } = job.data as { citaId: string; canal?: string }

    const cita = await db.cita.findUnique({
      where: { id: citaId },
      include: {
        paciente: true,
        medico: {
          include: { member: { include: { user: true } } },
        },
      },
    })

    if (!cita) {
      logger.warn({ citaId }, "[recordatorio] Cita no encontrada, omitiendo job")
      return
    }

    const canal: string | null = cita.paciente?.canalNotificacion ?? null
    if (!canal) {
      logger.info({ citaId }, "[recordatorio] Paciente sin canalNotificacion configurado, omitiendo recordatorio")
      return
    }

    if (canal === "EMAIL") {
      const emailPaciente = cita.paciente?.email
      const emailMedico = cita.medico?.member?.user?.email

      logger.info(
        { citaId, emailPaciente, emailMedico, fechaHora: cita.fechaHora },
        "[recordatorio] Enviando recordatorio EMAIL (stub)",
      )

      await db.recordatorioCita.create({
        data: { citaId, canal, estadoEnvio: "ENVIADO" },
      })
    } else {
      logger.info({ citaId, canal }, "[recordatorio] Recordatorio SMS/WHATSAPP pendiente de integración")
      await db.recordatorioCita.create({
        data: { citaId, canal, estadoEnvio: "PENDIENTE" },
      })
    }
  },
  {
    connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
    concurrency: 5,
  },
)

recordatorioCitaWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "[recordatorio] Job fallido")
})
