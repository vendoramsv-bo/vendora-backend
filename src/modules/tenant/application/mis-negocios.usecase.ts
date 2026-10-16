import { normalizarRol } from "../domain/roles-por-vertical.js"

/** Un negocio donde la persona tiene membresía activa, con su rol ahí. */
export interface MiNegocioDTO {
  id: string
  slug: string
  nombre: string
  logoUrl: string | null
  /** Normalizado: `owner` → `PROPIETARIO`. */
  rol: string
  esTienda: boolean
  esConsultorio: boolean
  esRestaurante: boolean
}

interface FilaMembresia {
  role: string
  tenant: {
    id: string
    slug: string
    name: string
    logo: string | null
    esTienda: boolean
    esConsultorio: boolean
    esRestaurante: boolean
  }
}

/** Lo único que este caso de uso necesita del cliente Prisma. */
export interface DbMisNegocios {
  tenantMember: { findMany(args: unknown): Promise<FilaMembresia[]> }
}

/**
 * Los negocios de la persona con sesión, con su rol en cada uno (spec 037 B2).
 *
 * Better-Auth no trae el rol en `organization/list`: solo lo conoce para el
 * negocio activo. La vitrina necesita saberlo para el negocio que mira, que casi
 * nunca es el activo (research R1). No exige negocio activo a propósito.
 */
export class MisNegociosUseCase {
  constructor(private readonly db: DbMisNegocios) {}

  async ejecutar(userId: string): Promise<MiNegocioDTO[]> {
    const filas = await this.db.tenantMember.findMany({
      where: {
        userId,
        estado: "ACTIVO",
        tenant: { estado: { not: "ELIMINADO" } },
      },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            logo: true,
            esTienda: true,
            esConsultorio: true,
            esRestaurante: true,
          },
        },
      },
    })

    return filas.map(({ role, tenant }) => ({
      id: tenant.id,
      slug: tenant.slug,
      nombre: tenant.name,
      logoUrl: tenant.logo,
      rol: normalizarRol(role),
      esTienda: tenant.esTienda,
      esConsultorio: tenant.esConsultorio,
      esRestaurante: tenant.esRestaurante,
    }))
  }
}
