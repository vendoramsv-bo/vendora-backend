import { describe, it, expect, vi } from "vitest"
import { OcultarPreguntaTiendaUseCase } from "../../../../src/modules/social/application/tienda/ocultar-pregunta-tienda.usecase.js"
import { MostrarPreguntaTiendaUseCase } from "../../../../src/modules/social/application/tienda/mostrar-pregunta-tienda.usecase.js"
import type { ITiendaSocialRepository } from "../../../../src/modules/social/domain/ports/ITiendaSocialRepository.js"
import { TiendaPreguntaNoEncontradaError } from "../../../../src/modules/social/domain/social.errors.js"

function makeRepo(preguntaId = "preg-1", fail = false): ITiendaSocialRepository {
  return {
    resolveTiendaId: vi.fn().mockResolvedValue("tienda-1"),
    resolveTiendaInfo: vi.fn().mockResolvedValue({ tiendaId: "tienda-1", tenantId: "tenant-1" }),
    upsertReaccionTienda: vi.fn(),
    listarReaccionesTienda: vi.fn(),
    crearComentarioTienda: vi.fn(),
    findComentarioTienda: vi.fn(),
    editarComentarioTienda: vi.fn(),
    deleteRespuestasTienda: vi.fn(),
    deleteComentarioTienda: vi.fn(),
    listarComentariosTienda: vi.fn(),
    upsertValoracionTienda: vi.fn(),
    getPromedioValoracionesTienda: vi.fn(),
    listarValoracionesTienda: vi.fn(),
    crearPreguntaTienda: vi.fn(),
    findPreguntaTienda: vi.fn(),
    crearRespuestaTienda: vi.fn(),
    listarPreguntasTienda: vi.fn(),
    ocultarPreguntaTienda: fail
      ? vi.fn().mockRejectedValue(new Error("Not found"))
      : vi.fn().mockResolvedValue({ id: preguntaId, tiendaId: "tienda-1", userId: "u-1", pregunta: "¿Hay delivery?", estado: "INACTIVO", createdAt: new Date(), updatedAt: new Date() }),
    mostrarPreguntaTienda: fail
      ? vi.fn().mockRejectedValue(new Error("Not found"))
      : vi.fn().mockResolvedValue({ id: preguntaId, tiendaId: "tienda-1", userId: "u-1", pregunta: "¿Hay delivery?", estado: "ACTIVO", createdAt: new Date(), updatedAt: new Date() }),
    toggleFavoritoTienda: vi.fn(),
    esFavoritoTienda: vi.fn(),
    toggleSeguirTienda: vi.fn(),
    contarSeguidoresTienda: vi.fn(),
    listarFavoritosTiendasUsuario: vi.fn(),
  }
}

describe("OcultarPreguntaTiendaUseCase", () => {
  it("oculta una pregunta (estado INACTIVO)", async () => {
    const repo = makeRepo("preg-1")
    const uc = new OcultarPreguntaTiendaUseCase(repo)

    const result = await uc.execute("tienda-slug", "preg-1")

    expect(result.estado).toBe("INACTIVO")
    expect(repo.ocultarPreguntaTienda).toHaveBeenCalledWith("preg-1", "tienda-1")
  })

  it("lanza TiendaPreguntaNoEncontradaError si la pregunta no existe", async () => {
    const repo = makeRepo("preg-1", true)
    const uc = new OcultarPreguntaTiendaUseCase(repo)

    await expect(uc.execute("tienda-slug", "no-existe")).rejects.toThrow(TiendaPreguntaNoEncontradaError)
  })
})

describe("MostrarPreguntaTiendaUseCase", () => {
  it("muestra una pregunta ocultada (estado ACTIVO)", async () => {
    const repo = makeRepo("preg-1")
    const uc = new MostrarPreguntaTiendaUseCase(repo)

    const result = await uc.execute("tienda-slug", "preg-1")

    expect(result.estado).toBe("ACTIVO")
  })
})
