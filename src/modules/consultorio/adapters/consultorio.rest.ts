import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ConsultorioPrismaRepository } from "../infrastructure/consultorio.prisma.repository.js"
import { ObtenerConsultorioUseCase } from "../application/consultorio/obtener-consultorio.usecase.js"
import { ActualizarConsultorioUseCase } from "../application/consultorio/actualizar-consultorio.usecase.js"
import { ConsultorioPerfilSchema } from "./consultorio.schema.js"
import { ConsultorioNoEncontrado } from "../domain/consultorio.errors.js"

export const consultorioPerfilRouter = new Hono<HonoEnv>()

consultorioPerfilRouter.get("/perfil", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repo = new ConsultorioPrismaRepository(prisma as any)
  const useCase = new ObtenerConsultorioUseCase(repo)
  try {
    const consultorio = await useCase.ejecutar(tenantId)
    return c.json(consultorio.toJSON())
  } catch (err) {
    if (err instanceof ConsultorioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
  void session
})

consultorioPerfilRouter.put(
  "/perfil",
  requireRol(["PROPIETARIO", "ADMIN"]),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ConsultorioPerfilSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new ConsultorioPrismaRepository(prisma as any)
    const useCase = new ActualizarConsultorioUseCase(repo)
    const consultorio = await useCase.ejecutar(tenantId, parsed.data, session.user.id)
    return c.json(consultorio.toJSON())
  },
)
