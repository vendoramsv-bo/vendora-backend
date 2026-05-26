import { describe, it, expect, vi, beforeEach } from "vitest"
import { EliminarComentarioProductoUseCase } from "../../../../src/modules/social/application/producto/eliminar-comentario-producto.usecase.js"
import type { IProductoSocialRepository } from "../../../../src/modules/social/domain/ports/IProductoSocialRepository.js"
import { ComentarioNoEncontrado, NoAutorizado } from "../../../../src/modules/social/domain/social.errors.js"

function makeComentario(padreId: string | null = null) {
  return {
    id: "com-1",
    productoId: "prod-1",
    tenantId: "tenant-1",
    userId: "user-autor",
    contenido: "Hola",
    editado: false,
    estado: "ACTIVO",
    padreId,
    createdAt: new Date(),
    updatedAt: null,
  }
}

function makeRepo(overrides: Partial<IProductoSocialRepository> = {}): IProductoSocialRepository {
  return {
    findProductoTenantId: vi.fn(),
    productoExiste: vi.fn(),
    toggleReaccionProducto: vi.fn(),
    listarReaccionesProducto: vi.fn(),
    crearComentarioProducto: vi.fn(),
    findComentarioProducto: vi.fn(),
    editarComentarioProducto: vi.fn(),
    deleteRespuestasProducto: vi.fn().mockResolvedValue(undefined),
    deleteComentarioProducto: vi.fn().mockResolvedValue(undefined),
    listarComentariosProducto: vi.fn(),
    upsertValoracionProducto: vi.fn(),
    getPromedioValoracionesProducto: vi.fn(),
    listarValoracionesProducto: vi.fn(),
    crearPreguntaProducto: vi.fn(),
    findPreguntaProducto: vi.fn(),
    crearRespuestaProducto: vi.fn(),
    listarPreguntasProducto: vi.fn(),
    toggleFavoritoProducto: vi.fn(),
    listarFavoritosUsuario: vi.fn(),
    ...overrides,
  }
}

describe("EliminarComentarioProductoUseCase", () => {
  it("elimina respuestas antes que el comentario raíz", async () => {
    const repo = makeRepo({ findComentarioProducto: vi.fn().mockResolvedValue(makeComentario(null)) })
    const useCase = new EliminarComentarioProductoUseCase(repo)

    const result = await useCase.ejecutar("com-1", "user-autor")

    expect(repo.deleteRespuestasProducto).toHaveBeenCalledWith("com-1")
    expect(repo.deleteComentarioProducto).toHaveBeenCalledWith("com-1")
    expect(result).toEqual({ deleted: true })
  })

  it("elimina respuesta directamente sin llamar deleteRespuestas", async () => {
    const repo = makeRepo({ findComentarioProducto: vi.fn().mockResolvedValue(makeComentario("com-padre")) })
    const useCase = new EliminarComentarioProductoUseCase(repo)

    await useCase.ejecutar("com-1", "user-autor")

    expect(repo.deleteRespuestasProducto).not.toHaveBeenCalled()
    expect(repo.deleteComentarioProducto).toHaveBeenCalledWith("com-1")
  })

  it("lanza ComentarioNoEncontrado si no existe", async () => {
    const repo = makeRepo({ findComentarioProducto: vi.fn().mockResolvedValue(null) })
    await expect(new EliminarComentarioProductoUseCase(repo).ejecutar("no-existe", "user-1")).rejects.toThrow(ComentarioNoEncontrado)
  })

  it("lanza NoAutorizado si el usuario no es el autor ni moderador", async () => {
    const repo = makeRepo({ findComentarioProducto: vi.fn().mockResolvedValue(makeComentario(null)) })
    await expect(new EliminarComentarioProductoUseCase(repo).ejecutar("com-1", "otro-user")).rejects.toThrow(NoAutorizado)
  })

  it("permite eliminar si el usuario es ADMIN aunque no sea el autor", async () => {
    const repo = makeRepo({ findComentarioProducto: vi.fn().mockResolvedValue(makeComentario(null)) })
    const result = await new EliminarComentarioProductoUseCase(repo).ejecutar("com-1", "otro-user", "ADMIN")
    expect(result).toEqual({ deleted: true })
  })
})
