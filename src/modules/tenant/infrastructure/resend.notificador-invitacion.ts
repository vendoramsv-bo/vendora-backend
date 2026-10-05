import { Resend } from "resend"
import pino from "pino"
import type { INotificadorInvitacion } from "../domain/ports/INotificadorInvitacion.js"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// Mismo correo que `sendInvitationEmail` de better-auth.setup.ts: la aceptación la
// sigue haciendo Better-Auth en /invite/{id}, así que la URL tiene que coincidir.
export class ResendNotificadorInvitacion implements INotificadorInvitacion {
  private readonly resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  async enviarInvitacion({ email, invitacionId, nombreNegocio }: { email: string; invitacionId: string; nombreNegocio: string }) {
    if (!this.resend) {
      logger.warn({ invitacionId }, "[invitaciones] RESEND_API_KEY no configurada — la invitación se creó pero no se envió el correo")
      return
    }
    const inviteUrl = `${process.env.APP_URL}/invite/${invitacionId}`
    await this.resend.emails.send({
      from: "Vendora <noreply@vendora.app>",
      to: email,
      subject: `Invitación a ${nombreNegocio} en Vendora`,
      html: `<p>Te han invitado a unirte a <strong>${escaparHtml(nombreNegocio)}</strong>.</p>
             <p><a href="${inviteUrl}">Aceptar invitación</a></p>
             <p>La invitación expira en 7 días.</p>`,
    })
  }
}

function escaparHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}
