import type { PrismaClient } from "../../../generated/prisma/client.js"

/**
 * El negocio que queda activo al crear una sesión: el más reciente **disponible**.
 *
 * La baja de un negocio es lógica (`DELETE /api/tenant/actual`): las
 * membresías quedan intactas. Sin el filtro de estado, quien acaba de dar de
 * baja su negocio volvía a entrar a él al iniciar sesión y cada petición le
 * respondía 403 (frontend spec 038, research R6). Sin membresías elegibles
 * devuelve `null`, y el cliente lleva al asistente de alta.
 */
export async function elegirNegocioActivoInicial(
  prisma: Pick<PrismaClient, "tenantMember">,
  userId: string,
): Promise<string | null> {
  const ultimoMiembro = await prisma.tenantMember.findFirst({
    where: { userId, tenant: { estado: { not: "ELIMINADO" } } },
    orderBy: { createdAt: "desc" },
    select: { organizationId: true },
  })
  return ultimoMiembro?.organizationId ?? null
}
