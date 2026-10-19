import { describe, it, expect, vi } from "vitest"
import { elegirNegocioActivoInicial } from "../../../../src/modules/autenticacion/infrastructure/negocio-activo-inicial.js"

/**
 * Qué negocio queda activo al crear una sesión (frontend 038 research R6).
 *
 * La baja de un negocio es lógica: las membresías quedan intactas. Si al iniciar
 * sesión se eligiera la membresía más reciente sin mirar el estado, quien acaba
 * de dar de baja su negocio volvería a entrar a él y cada petición le
 * respondería 403. Lo que se protege:
 *
 * 1. La consulta excluye los negocios ELIMINADO.
 * 2. Sin membresías elegibles, la sesión arranca sin negocio activo — y el
 *    cliente lleva al asistente de alta.
 */
function fakePrisma(resultado: { organizationId: string } | null) {
  const findFirst = vi.fn().mockResolvedValue(resultado)
  return { findFirst, prisma: { tenantMember: { findFirst } } }
}

describe("elegirNegocioActivoInicial", () => {
  it("excluye los negocios dados de baja y elige el más reciente", async () => {
    const { prisma, findFirst } = fakePrisma({ organizationId: "tenant-vivo" })

    const elegido = await elegirNegocioActivoInicial(prisma as never, "user-1")

    expect(elegido).toBe("tenant-vivo")
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", tenant: { estado: { not: "ELIMINADO" } } },
        orderBy: { createdAt: "desc" },
      }),
    )
  })

  it("sin negocios disponibles devuelve null", async () => {
    const { prisma } = fakePrisma(null)
    expect(await elegirNegocioActivoInicial(prisma as never, "user-1")).toBeNull()
  })
})
