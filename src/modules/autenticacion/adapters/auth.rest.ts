import { Hono } from "hono"
import { auth, prisma } from "../infrastructure/better-auth.setup.js"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"

// T009 — handler delegando a BA para /api/auth/**
// Cubre implícitamente FR-008 (sign-out), FR-013 (update tenant),
// FR-021 (set-active), FR-028 (delete tenant) vía endpoints nativos de BA.

export const authRouter = new Hono<HonoEnv>()

authRouter.on(["GET", "POST", "PUT", "PATCH", "DELETE"], "/auth/**", (c) => {
  return auth.handler(c.req.raw)
})

// T016a — DELETE /api/user (FR-031): eliminación de cuenta del usuario autenticado.
// Flujo: requireAuth → sole-owned tenants → deleteOrganization server-side →
//        $transaction Prisma (FK refs en orden) → 204.
// NO usa auth.api.removeUser: pertenece al admin plugin y exige rol admin (→403).
authRouter.delete("/user", requireAuth, async (c) => {
  const session = c.get("session")
  const userId = session.user.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any

  // (2) Tenants donde el usuario es owner/PROPIETARIO
  const membresiasPropietario = await db.tenantMember.findMany({
    where: { userId, role: { in: ["owner", "PROPIETARIO"] } },
    select: { organizationId: true },
  })

  // (3) Sole-owned tenants → deleteOrganization server-side (cascade via Prisma)
  for (const { organizationId } of membresiasPropietario) {
    const otrosOwners = await db.tenantMember.count({
      where: {
        organizationId,
        userId: { not: userId },
        role: { in: ["owner", "PROPIETARIO"] },
      },
    })

    if (otrosOwners === 0) {
      await auth.api.deleteOrganization({
        body: { organizationId },
        headers: c.req.raw.headers,
      })
    }
  }

  // (4) $transaction: borrar FK references en orden antes de User
  await db.$transaction(async (tx: typeof db) => {
    await tx.invitacion.deleteMany({ where: { inviterId: userId } })
    await tx.propietario.deleteMany({ where: { userId } })
    await tx.tenantMember.deleteMany({ where: { userId } })
    await tx.session.deleteMany({ where: { userId } })
    await tx.account.deleteMany({ where: { userId } })
    await tx.user.delete({ where: { id: userId } })
  })

  // (5) 204 No Content
  return new Response(null, { status: 204 })
})
