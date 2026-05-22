import { describe, it, expect, beforeEach, vi } from "vitest"
import { CambiarEstadoCategoriaUseCase } from "../../src/modules/catalogo/application/categoria/cambiar-estado-categoria.usecase.js"
import { CategoriaNoEncontrada } from "../../src/modules/catalogo/domain/catalogo.errors.js"
import { FakeCatalogoNotificador } from "../helpers/fake-catalogo.notificador.js"
import type { ICategoriaRepository } from "../../src/modules/catalogo/domain/ports/ICategoriaRepository.js"
import { CategoriaEntity } from "../../src/modules/catalogo/domain/categoria.entity.js"

const TENANT = "t1"
const USER = "u1"

function makeCategoria(id: string, padreId: string | null = null, nivel = 1): CategoriaEntity {
  return CategoriaEntity.fromPrisma({
    id,
    tenantId: TENANT,
    actividadId: "act1",
    nombre: `Categoría ${id}`,
    padreId,
    nivel,
    estado: "ACTIVO",
    createdAt: new Date(),
  })
}

describe("CambiarEstadoCategoriaUseCase", () => {
  let notificador: FakeCatalogoNotificador
  let useCase: CambiarEstadoCategoriaUseCase
  let desactivarConCascadaSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    notificador = new FakeCatalogoNotificador()
    desactivarConCascadaSpy = vi.fn().mockResolvedValue(undefined)

    const repo: ICategoriaRepository = {
      listar: vi.fn().mockResolvedValue([]),
      crear: vi.fn(),
      obtener: vi.fn().mockResolvedValue(makeCategoria("cat1")),
      actualizar: vi.fn().mockResolvedValue(makeCategoria("cat1")),
      desactivarConCascada: desactivarConCascadaSpy,
    }

    useCase = new CambiarEstadoCategoriaUseCase(repo, notificador)
  })

  it("llama desactivarConCascada cuando estado es INACTIVO", async () => {
    await useCase.ejecutar("cat1", "INACTIVO", TENANT, USER)
    expect(desactivarConCascadaSpy).toHaveBeenCalledWith("cat1", USER)
  })

  it("emite catalogo:categoria:actualizada tras desactivar", async () => {
    await useCase.ejecutar("cat1", "INACTIVO", TENANT, USER)
    expect(notificador.tieneEvento("catalogo:categoria:actualizada", (p) => (p as { estado: string }).estado === "INACTIVO")).toBe(true)
  })

  it("lanza CategoriaNoEncontrada si la categoría no existe", async () => {
    const repoVacio: ICategoriaRepository = {
      listar: vi.fn().mockResolvedValue([]),
      crear: vi.fn(),
      obtener: vi.fn().mockResolvedValue(null),
      actualizar: vi.fn(),
      desactivarConCascada: vi.fn(),
    }
    const uc = new CambiarEstadoCategoriaUseCase(repoVacio, notificador)
    await expect(uc.ejecutar("noexiste", "INACTIVO", TENANT, USER)).rejects.toThrow(CategoriaNoEncontrada)
  })
})
