import "dotenv/config"
import { betterAuth, APIError } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { organization, admin } from "better-auth/plugins"
import { Resend } from "resend"
import { PrismaClient } from "../../../generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"

const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
export const prisma = new PrismaClient({ adapter: pgAdapter })

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Notificador de tenant ────────────────────────────────────────────────────
// Estrategia: intenta cargar el socketNotificador real (disponible tras US5/T047);
// si no está disponible (arranque con módulos parciales) usa NullTenantNotificador.
// El dynamic import rompe la dependencia circular: server/index.ts → better-auth.setup.ts.
async function getNotificador() {
  try {
    // En runtime completo (US5): server/index.ts exporta socketNotificador real
    const server = await import("../../../server/index.js")
    if ("socketNotificador" in server && server.socketNotificador) {
      return server.socketNotificador
    }
  } catch {
    // Módulo server aún no cargado (arranque parcial) — usar stub
  }
  try {
    const { notificador } = await import("../../tenant/infrastructure/null-tenant.notificador.js")
    return notificador
  } catch {
    return null
  }
}

// ─── Better-Auth instance ─────────────────────────────────────────────────────
// La inferencia de tipo de `betterAuth` referencia zod@4 (dependencia interna de BA)
// mientras el proyecto usa zod@3. El cast a `any` evita el error de tipo no portable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ── Email + contraseña ────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    autoSignIn: false,

    // T013 — Enviar email de restablecimiento de contraseña
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: "Vendora <noreply@vendora.app>",
        to: user.email,
        subject: "Restablecer contraseña",
        html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
               <p><a href="${url}">${url}</a></p>
               <p>El enlace expira en 24 horas.</p>`,
      })
    },
  },

  // T012 — Verificación de email
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: "Vendora <noreply@vendora.app>",
        to: user.email,
        subject: "Verificar tu email en Vendora",
        html: `<p>Hola ${user.name},</p>
               <p>Haz clic en el siguiente enlace para verificar tu email:</p>
               <p><a href="${url}">${url}</a></p>
               <p>El enlace expira en 24 horas.</p>`,
      })
    },
  },

  // T014 — Google OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // T015 — Rate limiting: BA responde 429 + Retry-After al superar intentos.
  // El cliente aplica backoff respetando el header (sin progresión fija servidor-side).
  rateLimit: {
    window: 60,
    max: 5,
    storage: "memory",
  },

  // ── Campos adicionales del modelo User ────────────────────────────────────
  user: {
    additionalFields: {
      userName:  { type: "string",  required: true,  input: true },
      firstName: { type: "string",  required: false, input: true },
      lastName:  { type: "string",  required: false, input: true },
      locked:    { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    // T008 base + T029a: organization plugin con additionalFields incluyendo
    // esTienda/esConsultorio/esRestaurante con input:true (requerido para PATCH update).
    organization({
      schema: {
        organization: {
          modelName: "Tenant",
          additionalFields: {
            nombreLargo:        { type: "string",  required: true,  input: true },
            descripcion:        { type: "string",  required: true,  input: true },
            esTienda:           { type: "boolean", required: false, defaultValue: false, input: true },
            esConsultorio:      { type: "boolean", required: false, defaultValue: false, input: true },
            esRestaurante:      { type: "boolean", required: false, defaultValue: false, input: true },
            plan:               { type: "string",  required: false, defaultValue: "BASICO",    input: true },
            estado:             { type: "string",  required: false, defaultValue: "PENDIENTE", input: false },
            ultimoPasoCreacion: { type: "number",  required: false, defaultValue: 1,           input: true },
          },
        },
        member: {
          modelName: "TenantMember",
          additionalFields: {
            estado: { type: "string", required: false, defaultValue: "ACTIVO", input: false },
          },
        },
        invitation: {
          modelName: "Invitacion",
        },
      },

      allowUserToCreateOrganization: async () => true,

      async sendInvitationEmail({ email, invitation, organization: org }) {
        const inviteUrl = `${process.env.APP_URL}/invite/${invitation.id}`
        await resend.emails.send({
          from: "Vendora <noreply@vendora.app>",
          to: email,
          subject: `Invitación a ${org.name} en Vendora`,
          html: `<p>Te han invitado a unirte a <strong>${org.name}</strong>.</p>
                 <p><a href="${inviteUrl}">Aceptar invitación</a></p>
                 <p>La invitación expira en 7 días.</p>`,
        })
      },

      // T022 — Hook: tenant creado → crear Propietario + emitir evento
      async onOrganizationCreated({ organization: org, member }: { organization: { id: string; name: string }; member: { userId: string; organizationId: string } }) {
        await prisma.propietario.create({
          data: {
            tenantId: org.id,
            userId: member.userId,
            nombres: "",
            telefono: "",
            domicilio: "",
            nombreReferencia: "",
            telefonoReferencia: "",
            createdById: member.userId,
            updatedById: member.userId,
          },
        })

        const notif = await getNotificador()
        notif?.miembroUnido(org.id, member.userId)
      },

      // T023 — Hook: tenant actualizado → emitir evento
      async onOrganizationUpdated({ organization: org }: { organization: { id: string; [key: string]: unknown } }) {
        const notif = await getNotificador()
        notif?.tenantActualizado(org.id, org)
      },

      // T024 — Hook: tenant eliminado → emitir evento
      async onOrganizationDeleted({ organizationId }: { organizationId: string }) {
        const notif = await getNotificador()
        notif?.tenantEliminado(organizationId)
      },

      // T033 — Hook: miembro creado (invitado aceptó) → emitir evento
      async onMemberCreated({ member }: { member: { organizationId: string; userId: string } }) {
        const notif = await getNotificador()
        notif?.miembroUnido(member.organizationId, member.userId)
      },

      // T034 — Hook: miembro eliminado/salió → emitir evento
      async onMemberDeleted({ member }: { member: { organizationId: string; userId: string } }) {
        const notif = await getNotificador()
        notif?.miembroRemovido(member.organizationId, member.userId)
      },

      // T034a — Guard sole-owner: BA no bloquea nativamente la eliminación del único propietario.
      // Si el miembro a remover es el único owner/PROPIETARIO → rechazar.
      async beforeRemoveMember({ member }: { member: { organizationId: string; userId: string; role: string } }) {
        if (member.role !== "owner" && member.role !== "PROPIETARIO") return

        const ownerCount = await prisma.tenantMember.count({
          where: {
            organizationId: member.organizationId,
            role: { in: ["owner", "PROPIETARIO"] },
          },
        })

        if (ownerCount <= 1) {
          throw new APIError("BAD_REQUEST", {
            message: "No puedes eliminar al único propietario del tenant",
          })
        }
      },
    }),

    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],

  // ── Sesiones ──────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge:  60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  // T036a — Restaurar activeOrganizationId al crear sesión.
  // BA inicializa activeOrganizationId en null por defecto; este hook
  // lo puebla con el tenant más reciente del usuario.
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const ultimoMembro = await prisma.tenantMember.findFirst({
            where: { userId: session.userId },
            orderBy: { createdAt: "desc" },
            select: { organizationId: true },
          })

          return {
            data: {
              ...session,
              activeOrganizationId: ultimoMembro?.organizationId ?? null,
            },
          }
        },
      },
    },
  },

  // ── Performance ───────────────────────────────────────────────────────────
  experimental: {
    joins: true,
  },

  // ── Seguridad ─────────────────────────────────────────────────────────────
  trustedOrigins: [
    process.env.APP_URL!,
    ...(process.env.FRONTEND_URLS?.split(",").map((u) => u.trim()).filter(Boolean) ?? []),
  ],
  secret:  process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.APP_URL!,
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
