import { PrismaClient } from "../generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"

const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
export const prismaBase = new PrismaClient({ adapter: pgAdapter })

// ─── crearPrismaScoped ────────────────────────────────────────────────────────
//
// Crea un cliente Prisma extendido por request que:
//   • En create: inyecta tenantId/organizationId, createdById, updatedById
//   • En findMany/findFirst: agrega where: { tenantId } según el modelo
//   • En update: inyecta updatedById
//   • En TenantMember: normaliza role "owner" → "PROPIETARIO" al leer
//
// Artículo III.3 (Constitución): NO-NEGOCIABLE.

export function crearPrismaScoped(tenantId: string, userId: string) {
  return prismaBase.$extends({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: {} as any,
    result: {
      tenantMember: {
        role: {
          needs: { role: true },
          compute(member: { role: string }) {
            // "owner" (BA) ≡ "PROPIETARIO" (dominio) — equivalencia canónica (ver hono-context.ts)
            return member.role === "owner" ? "PROPIETARIO" : member.role
          },
        },
      },
    },
  })
}

// ─── Tipo exportado ───────────────────────────────────────────────────────────

export type ScopedPrismaClient = ReturnType<typeof crearPrismaScoped>

// ─── Helper: enriquecer args de create con auditoría ─────────────────────────

export function withAudit<T extends Record<string, unknown>>(
  data: T,
  userId: string,
  tenantId?: string,
): T & { createdById: string; updatedById: string } {
  return { ...data, createdById: userId, updatedById: userId, ...(tenantId ? { tenantId } : {}) }
}

// ─── Helper: where con tenant scope ──────────────────────────────────────────

export function withTenantScope<T extends Record<string, unknown>>(
  where: T,
  tenantId: string,
  field: "tenantId" | "organizationId" = "tenantId",
): T & Record<string, string> {
  return { ...where, [field]: tenantId }
}
