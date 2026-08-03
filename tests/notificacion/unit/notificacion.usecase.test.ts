import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  ListarNotificacionesUseCase,
  ContarNoLeidasUseCase,
  MarcarLeidaUseCase,
  CrearNotificacionUseCase,
} from "../../../src/modules/notificacion/application/notificacion.usecases.js"

/**
 * Cambio B7 de la spec 019 — módulo de notificaciones.
 *
 * Antes de este cambio el modelo `Notificacion` existía en el schema pero no
 * había repositorio, ni rutas, ni emisión: el evento
 * `notifications:unread:count` estaba declarado en `@vendora/realtime` y el panel
 * lo escuchaba, pero nadie lo emitía. El contador estaba en cero permanente.
 *
 * La regla que estos tests fijan: **crear y marcar leída reemiten el contador**.
 * Sin eso, el badge solo se actualizaría al recargar y FR-033 pediría lo
 * contrario.
 */

const USER_ID = "u1"

const NOTIFICACION = {
  id: "n1",
  titulo: "Pedido enviado",
  mensaje: "Tu pedido llegó a la tienda.",
  fecha: "2026-08-02T10:00:00.000Z",
  leida: false,
  referenciaTipo: "PEDIDO",
  referenciaId: "pedido-1",
}

function crearRepo(overrides: Record<string, unknown> = {}) {
  return {
    listarPorUsuario: vi.fn(async () => ({ data: [NOTIFICACION], total: 1 })),
    contarNoLeidas: vi.fn(async () => 3),
    marcarLeida: vi.fn(async () => ({ ...NOTIFICACION, leida: true })),
    crear: vi.fn(async () => NOTIFICACION),
    ...overrides,
  } as any
}

const crearNotificador = () => ({ contadorNoLeidas: vi.fn() })

beforeEach(() => vi.clearAllMocks())

describe("ListarNotificacionesUseCase (FR-032)", () => {
  it("lista solo las del usuario de la sesión", async () => {
    const repo = crearRepo()
    await new ListarNotificacionesUseCase(repo).execute(USER_ID, { take: 20, page: 1 })

    expect(repo.listarPorUsuario).toHaveBeenCalledWith(USER_ID, { take: 20, page: 1 })
  })
})

describe("ContarNoLeidasUseCase (FR-032)", () => {
  it("devuelve el conteo de no leídas del usuario", async () => {
    const repo = crearRepo()

    await expect(new ContarNoLeidasUseCase(repo).execute(USER_ID)).resolves.toBe(3)
    expect(repo.contarNoLeidas).toHaveBeenCalledWith(USER_ID)
  })
})

describe("MarcarLeidaUseCase (FR-033, FR-034)", () => {
  it("marca leída y reemite el contador actualizado", async () => {
    const repo = crearRepo({ contarNoLeidas: vi.fn(async () => 2) })
    const notificador = crearNotificador()

    const resultado = await new MarcarLeidaUseCase(repo, notificador).execute("n1", USER_ID)

    expect(resultado?.leida).toBe(true)
    // Sin esta emisión, el badge solo bajaría al recargar.
    expect(notificador.contadorNoLeidas).toHaveBeenCalledWith(USER_ID, 2)
  })

  it("una notificación ajena devuelve null y NO emite nada", async () => {
    // El repositorio pone el userId en el where, así que una ajena no matchea.
    const repo = crearRepo({ marcarLeida: vi.fn(async () => null) })
    const notificador = crearNotificador()

    const resultado = await new MarcarLeidaUseCase(repo, notificador).execute("n-ajena", USER_ID)

    expect(resultado).toBeNull()
    expect(notificador.contadorNoLeidas).not.toHaveBeenCalled()
  })
})

describe("CrearNotificacionUseCase (FR-033)", () => {
  it("crea la notificación y reemite el contador al destinatario", async () => {
    const repo = crearRepo({ contarNoLeidas: vi.fn(async () => 4) })
    const notificador = crearNotificador()

    await new CrearNotificacionUseCase(repo, notificador).execute({
      tenantId: "t1",
      userId: USER_ID,
      actorUserId: USER_ID,
      titulo: "Pedido enviado",
      mensaje: "Tu pedido llegó a la tienda.",
      referenciaTipo: "PEDIDO",
      referenciaId: "pedido-1",
    })

    expect(repo.crear).toHaveBeenCalled()
    // Es lo que hace subir el contador sin que el visitante recargue (FR-033).
    expect(notificador.contadorNoLeidas).toHaveBeenCalledWith(USER_ID, 4)
  })
})
