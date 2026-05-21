// =============================================================================
// auth.ts — Configuración de Better-Auth para TuPlataformaAmiga
//
// Plataforma SaaS multi-tenant unificada con 3 verticales:
//   • TuTiendaAmiga        (esTienda)
//   • TuConsultorioAmigo   (esConsultorio)
//   • TuRestaurant         (esRestaurante)
//
// Mapeos schema.prisma → tablas Better-Auth:
//   Tenant         → organization
//   TenantMember   → member
//   Invitacion     → invitation
//   User           → user
//   Session        → session
//   Account        → account
//   Verification   → verification
// =============================================================================

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin } from "better-auth/plugins";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ---- Autenticación por email y contraseña ----
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    autoSignIn: false,
  },

  // ---- Proveedores sociales (opcional) ----
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    // github: { ... }
  },

  // ---- Campos adicionales del modelo User ----
  user: {
    additionalFields: {
      userName:  { type: "string",  required: true,  input: true },
      firstName: { type: "string",  required: false, input: true },
      lastName:  { type: "string",  required: false, input: true },
      locked:    { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },

  // ---- Verificación de email ----
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      // TODO: integrar con proveedor de email (Resend, SendGrid, SES, etc.)
      console.log(`Enviar email a ${user.email} con link: ${url}`);
    },
  },

  // ---- Plugins ----
  plugins: [
    // ===== Plugin Organization =====
    // Mapea las tablas BA a los nombres de dominio: Tenant, TenantMember,
    // Invitacion. Los additionalFields incluyen los 3 flags de perfil
    // (esTienda, esConsultorio, esRestaurante) que un Tenant puede combinar
    // libremente.
    organization({
      schema: {
        organization: {
          modelName: "Tenant", // El modelo Prisma se llama Tenant
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

      // Los strings del campo `role` son libres. Cada vertical usa los suyos:
      //   Tienda:       "PROPIETARIO","ADMIN","VENDEDOR","BODEGUERO"
      //   Consultorio:  "ADMIN","MEDICO","RECEPCIONISTA"
      //   Restaurante:  "PROPIETARIO","ADMIN","ENCARGADO","VENDEDOR","CHEF","MESERO"
      allowUserToCreateOrganization: async (user) => {
        // Verificar plan/cuota antes de permitir crear otro tenant
        return true;
      },

      async sendInvitationEmail({ email, invitation, inviter, organization }) {
        // TODO: integrar email provider
        const inviteUrl = `${process.env.APP_URL}/invite/${invitation.id}`;
        console.log(`Invitación a ${email} para ${organization.name}: ${inviteUrl}`);
      },
    }),

    // ===== Plugin Admin (opcional) =====
    // Si se habilita, BA gestiona los campos `role`, `banned`, `banReason`,
    // `banExpiresAt` en User y `impersonatedBy` en Session automáticamente.
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],

  // ---- Sesiones ----
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge:  60 * 60 * 24,    // refrescar token cada 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // cache de 5 min para reducir hits a BD
    },
  },

  // ---- Performance ----
  experimental: {
    joins: true, // 2-3x más rápido en getSession y getFullOrganization
  },

  // ---- Seguridad ----
  trustedOrigins: [process.env.APP_URL!],
  secret:  process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.APP_URL!,
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
