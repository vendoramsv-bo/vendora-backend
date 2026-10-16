import { describe, it, expect, vi } from "vitest"
import { TiendaPrismaRepository } from "../../../src/modules/tienda/infrastructure/tienda.prisma.repository.js"

/**
 * Cambio B1 de la spec 037 — el perfil público suma las descripciones del
 * negocio y los campos de cada sede.
 *
 * El doble de Prisma aplica el `where`, el `orderBy` y el `select` que el
 * repositorio declara en el include, así el test prueba la consulta y no solo
 * el mapeo: si el repositorio dejara de filtrar por ACTIVO, la descripción
 * inactiva aparecería.
 */

const SLUG = "virgen-del-carmen"

const DESCRIPCIONES = [
  { id: "d2", descripcion: "Trabajamos con productores locales.", orden: 1, estado: "ACTIVO" },
  { id: "d3", descripcion: "Texto dado de baja.", orden: 2, estado: "INACTIVO" },
  { id: "d1", descripcion: "Somos una familia.\nAbrimos todos los días.", orden: 0, estado: "ACTIVO" },
]

const SEDES = [
  {
    id: "l2", latitud: -16.51, longitud: -68.12, direccion: "Calle 21", ciudad: "La Paz",
    barrio: "Calacoto", departamento: "La Paz", descripcion: null, email: "b@x.com",
    createdAt: new Date("2026-02-01"),
  },
  {
    id: "l1", latitud: -16.5, longitud: -68.15, direccion: "Av. 6 de Agosto 123", ciudad: "La Paz",
    barrio: "Sopocachi", departamento: "La Paz", descripcion: "Casa matriz", email: "a@x.com",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "l3", latitud: -16.5, longitud: -68.19, direccion: "Av. Juan Pablo II", ciudad: "El Alto",
    barrio: null, departamento: "La Paz", descripcion: "Sucursal", email: null,
    createdAt: new Date("2026-03-01"),
  },
]

type Fila = Record<string, unknown>
interface IncludeRelacion {
  where?: Fila
  orderBy?: Record<string, "asc" | "desc">
  select?: Record<string, boolean>
}

/** Aplica where/orderBy/select de un include, como haría Prisma. */
function aplicar(filas: Fila[], include: IncludeRelacion | undefined): Fila[] {
  if (!include) return []
  let resultado = filas.filter((f) =>
    Object.entries(include.where ?? {}).every(([k, v]) => f[k] === v),
  )
  const [campo, orden] = Object.entries(include.orderBy ?? {})[0] ?? []
  if (campo) {
    resultado = [...resultado].sort((a, b) => {
      const va = a[campo] as number | Date
      const vb = b[campo] as number | Date
      const d = Number(va) - Number(vb)
      return orden === "desc" ? -d : d
    })
  }
  if (include.select) {
    const campos = Object.keys(include.select).filter((k) => include.select![k])
    resultado = resultado.map((f) => Object.fromEntries(campos.map((k) => [k, f[k]])))
  }
  return resultado
}

function crearDb() {
  return {
    tenant: {
      findFirst: vi.fn(async ({ include }: { include: Record<string, IncludeRelacion> }) => ({
        id: "tenant-1",
        slug: SLUG,
        name: "Virgen del Carmen",
        descripcion: "Almacén de barrio",
        logo: null,
        tienda: {
          id: "tienda-1",
          configuracion: null,
          productosDestacados: [],
          valoracionesTienda: [],
          comentariosTienda: [],
          seguidoresTienda: [],
        },
        preferenciaPresentacion: null,
        localizaciones: aplicar(SEDES, include.localizaciones),
        descripciones: aplicar(DESCRIPCIONES, include.descripciones),
        propietarios: [],
        equipoDeTrabajo: [],
        imagenes: [],
        actividadesEconomicas: [],
      })),
    },
    productoValoracion: { groupBy: vi.fn(async () => [] as unknown[]) },
    productoFavorito: { groupBy: vi.fn(async () => [] as unknown[]) },
  }
}

describe("TiendaPrismaRepository.obtenerPerfilPublico — B1 de la spec 037", () => {
  it("devuelve solo las descripciones ACTIVO, ordenadas por `orden`", async () => {
    const repo = new TiendaPrismaRepository(crearDb() as never)

    const perfil = await repo.obtenerPerfilPublico(SLUG)

    expect(perfil?.descripciones).toEqual([
      { id: "d1", descripcion: "Somos una familia.\nAbrimos todos los días.", orden: 0 },
      { id: "d2", descripcion: "Trabajamos con productores locales.", orden: 1 },
    ])
  })

  it("devuelve todas las sedes, la primera cargada primero, con departamento y descripción", async () => {
    const repo = new TiendaPrismaRepository(crearDb() as never)

    const perfil = await repo.obtenerPerfilPublico(SLUG)

    expect(perfil?.localizaciones.map((l) => l.id)).toEqual(["l1", "l2", "l3"])
    expect(perfil?.localizaciones[0]).toEqual({
      id: "l1",
      latitud: -16.5,
      longitud: -68.15,
      direccion: "Av. 6 de Agosto 123",
      ciudad: "La Paz",
      barrio: "Sopocachi",
      departamento: "La Paz",
      descripcion: "Casa matriz",
    })
  })

  it("no expone el email de las sedes", async () => {
    const repo = new TiendaPrismaRepository(crearDb() as never)

    const perfil = await repo.obtenerPerfilPublico(SLUG)

    for (const sede of perfil?.localizaciones ?? []) {
      expect(sede).not.toHaveProperty("email")
    }
  })
})
