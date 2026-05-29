import { describe, it, expect, vi } from "vitest"
import { ActivarTiendaUseCase } from "../../../../src/modules/tienda/application/perfil/activar-tienda.usecase.js"
import type { ITiendaRepository } from "../../../../src/modules/tienda/domain/ports/ITiendaRepository.js"
import type { ITiendaNotificador } from "../../../../src/modules/tienda/domain/ports/ITiendaNotificador.js"

function makeRepo(tiendaId = "tienda-1"): ITiendaRepository {
  return {
    activar: vi.fn().mockResolvedValue({ esTienda: true, tiendaId }),
    desactivar: vi.fn(),
    obtenerConfiguracion: vi.fn(),
    actualizarConfiguracion: vi.fn(),
    obtenerPerfilPublico: vi.fn(),
    listarDirectorio: vi.fn(),
    agregarDestacado: vi.fn(),
    quitarDestacado: vi.fn(),
    reordenarDestacados: vi.fn(),
    listarDestacados: vi.fn(),
    listarCatalogoPublico: vi.fn(),
  }
}

function makeNotificador(): ITiendaNotificador {
  return {
    configuracionActualizada: vi.fn(),
    destacadosActualizados: vi.fn(),
    nuevaValoracion: vi.fn(),
    nuevoComentario: vi.fn(),
    nuevaPregunta: vi.fn(),
    nuevoSeguidor: vi.fn(),
  }
}

describe("ActivarTiendaUseCase", () => {
  it("activa la tienda y retorna esTienda=true con tiendaId", async () => {
    const repo = makeRepo("t-abc")
    const notif = makeNotificador()
    const uc = new ActivarTiendaUseCase(repo, notif)

    const result = await uc.execute("tenant-1", "user-1")

    expect(result.esTienda).toBe(true)
    expect(result.tiendaId).toBe("t-abc")
    expect(repo.activar).toHaveBeenCalledWith("tenant-1", "user-1")
  })

  it("emite evento configuracionActualizada tras activar", async () => {
    const repo = makeRepo("t-abc")
    const notif = makeNotificador()
    const uc = new ActivarTiendaUseCase(repo, notif)

    await uc.execute("tenant-1")

    expect(notif.configuracionActualizada).toHaveBeenCalledWith("tenant-1", "t-abc")
  })

  it("funciona sin notificador (null)", async () => {
    const repo = makeRepo()
    const uc = new ActivarTiendaUseCase(repo, null)

    const result = await uc.execute("tenant-1")

    expect(result.esTienda).toBe(true)
  })
})
