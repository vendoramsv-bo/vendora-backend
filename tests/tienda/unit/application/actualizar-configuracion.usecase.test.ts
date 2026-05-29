import { describe, it, expect, vi } from "vitest"
import { ActualizarConfiguracionUseCase } from "../../../../src/modules/tienda/application/perfil/actualizar-configuracion.usecase.js"
import type { ITiendaRepository, ConfiguracionDTO } from "../../../../src/modules/tienda/domain/ports/ITiendaRepository.js"
import type { ITiendaNotificador } from "../../../../src/modules/tienda/domain/ports/ITiendaNotificador.js"

function makeConfig(overrides?: Partial<ConfiguracionDTO>): ConfiguracionDTO {
  return { id: "cfg-1", tipoDespliegueVentas: "BARRA_LATERAL", tema: "green", tipoLineado: "curvedLine", tipoDeTienda: "PEQUENA", ...overrides }
}

function makeRepo(config: ConfiguracionDTO = makeConfig()): ITiendaRepository {
  return {
    activar: vi.fn(),
    desactivar: vi.fn(),
    obtenerConfiguracion: vi.fn(),
    actualizarConfiguracion: vi.fn().mockResolvedValue(config),
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

describe("ActualizarConfiguracionUseCase", () => {
  it("actualiza tema y retorna configuración", async () => {
    const updatedConfig = makeConfig({ tema: "blue" })
    const repo = makeRepo(updatedConfig)
    const notif = makeNotificador()
    const uc = new ActualizarConfiguracionUseCase(repo, notif)

    const result = await uc.execute("tenant-1", { tema: "blue" }, "user-1")

    expect(result.tema).toBe("blue")
    expect(repo.actualizarConfiguracion).toHaveBeenCalledWith("tenant-1", { tema: "blue" }, "user-1")
  })

  it("emite configuracionActualizada con el id de la configuración", async () => {
    const repo = makeRepo()
    const notif = makeNotificador()
    const uc = new ActualizarConfiguracionUseCase(repo, notif)

    await uc.execute("tenant-1", { tipoDespliegueVentas: "BARRA_SUPERIOR" })

    expect(notif.configuracionActualizada).toHaveBeenCalledWith("tenant-1", "cfg-1")
  })
})
