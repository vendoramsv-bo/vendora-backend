import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { auth, prisma } from "../infrastructure/better-auth.setup.js"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { errorResponses } from "../../../core/openapi-responses.js"

export const authRouter = new OpenAPIHono<HonoEnv>()

// Handler real de Better-Auth — debe ir ANTES del stub openapi para evitar
// que la validación Zod intercepte las peticiones con path params vacíos.
authRouter.all("/auth/*", (c) => auth.handler(c.req.raw))

// Stub documentativo — solo contribuye al spec OpenAPI; nunca se ejecuta
// porque el all() de arriba captura primero.
authRouter.openapi(
  createRoute({
    method: "get",
    path: "/auth/{path}",
    operationId: "auth_catch_all_better_auth",
    tags: ["Autenticación"],
    description:
      "Endpoints nativos de Better-Auth (sign-in, sign-up, sign-out, session, etc.). " +
      "Ver documentación en https://www.better-auth.com/docs",
    request: {
      params: z.object({ path: z.string() }),
    },
    responses: {
      200: { description: "Respuesta de Better-Auth (varía por ruta)" },
    },
  }),
  (c) => auth.handler(c.req.raw),
)

// DELETE /api/user — con schema explícito
authRouter.openapi(
  createRoute({
    method: "delete",
    path: "/user",
    operationId: "auth_eliminar_usuario",
    tags: ["Autenticación"],
    security: [{ bearerAuth: [] }],
    middleware: requireAuth,
    responses: {
      204: { description: "Usuario eliminado correctamente" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const userId = session.user.id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any

    const membresiasPropietario = await db.tenantMember.findMany({
      where: { userId, role: { in: ["owner", "PROPIETARIO"] } },
      select: { organizationId: true },
    })

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

    await db.$transaction(async (tx: typeof db) => {
      await tx.invitacion.deleteMany({ where: { inviterId: userId } })
      await tx.propietario.deleteMany({ where: { userId } })
      await tx.tenantMember.deleteMany({ where: { userId } })
      await tx.session.deleteMany({ where: { userId } })
      await tx.account.deleteMany({ where: { userId } })
      await tx.user.delete({ where: { id: userId } })
    })

    return new Response(null, { status: 204 })
  },
)
