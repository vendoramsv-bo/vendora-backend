import { describe, it, expect, vi } from "vitest"
import { ValorarProductoUseCase } from "../../../../src/modules/social/application/producto/valorar-producto.usecase.js"
import type { IProductoSocialRepository } from "../../../../src/modules/social/domain/ports/IProductoSocialRepository.js"
import type { ISocialNotificador } from "../../../../src/modules/social/domain/ports/ISocialNotificador.js"
import { PuntuacionInvalida, ProductoNoEncontrado } from "../../../../src/modules/social/domain/social.errors.js"

function makeRepo(overrides: Partial<IProductoSocialRepository> = {}): IProductoSocialRepository {
  return {
    findProductoTenantId: vi.fn().mockResolvedValue("tenant-1"),
    productoExiste: vi.fn().mockResolvedValue(true),
    toggleReaccionProducto: vi.fn(),
    listarReaccionesProducto: vi.fn(),
    crearComentarioProducto: vi.fn(),
    findComentarioProducto: vi.fn(),
    editarComentarioProducto: vi.fn(),
    deleteRespuestasProducto: vi.fn(),
    deleteComentarioProducto: vi.fn(),
    listarComentariosProducto: vi.fn(),
    upsertValoracionProducto: vi.fn().mockResolvedValue({ id: "val-1", puntuacion: 5, userId: "user-1", productoId: "prod-1", tenantId: "tenant-1", resena: null, estado: "ACTIVO", createdAt: new Date(), updatedAt: null }),
    getPromedioValoracionesProducto: vi.fn().mockResolvedValue(5.0),
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

function makeNotificador(): ISocialNotificador {
  return {
    reaccionCreada: vi.fn(),
    comentarioCreado: vi.fn(),
    valoracionCreada: vi.fn(),
    publicacionNueva: vi.fn(),
  }
}

describe("ValorarProductoUseCase", () => {
  it("crea valoración con puntuación válida", async () => {
    const repo = makeRepo()
    const notificador = makeNotificador()
    const result = await new ValorarProductoUseCase(repo, notificador).ejecutar("prod-1", "user-1", 5)

    expect(repo.upsertValoracionProducto).toHaveBeenCalledWith({ productoId: "prod-1", tenantId: "tenant-1", userId: "user-1", puntuacion: 5, resena: undefined })
    expect(notificador.valoracionCreada).toHaveBeenCalledWith("tenant-1", expect.objectContaining({ puntuacion: 5, nuevoPromedio: 5.0 }))
    expect(result).toMatchObject({ puntuacion: 5 })
  })

  it("lanza PuntuacionInvalida con puntuacion 0", async () => {
    const repo = makeRepo()
    await expect(new ValorarProductoUseCase(repo, makeNotificador()).ejecutar("prod-1", "user-1", 0)).rejects.toThrow(PuntuacionInvalida)
  })

  it("lanza PuntuacionInvalida con puntuacion 6", async () => {
    const repo = makeRepo()
    await expect(new ValorarProductoUseCase(repo, makeNotificador()).ejecutar("prod-1", "user-1", 6)).rejects.toThrow(PuntuacionInvalida)
  })

  it("lanza ProductoNoEncontrado si el producto no existe", async () => {
    const repo = makeRepo({ findProductoTenantId: vi.fn().mockResolvedValue(null) })
    await expect(new ValorarProductoUseCase(repo, makeNotificador()).ejecutar("no-existe", "user-1", 4)).rejects.toThrow(ProductoNoEncontrado)
  })

  it("llama upsert en segunda valoración del mismo usuario", async () => {
    const repo = makeRepo()
    await new ValorarProductoUseCase(repo, makeNotificador()).ejecutar("prod-1", "user-1", 3)
    expect(repo.upsertValoracionProducto).toHaveBeenCalledWith(expect.objectContaining({ puntuacion: 3 }))
  })
})
