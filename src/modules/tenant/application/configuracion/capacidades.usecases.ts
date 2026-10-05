import { TIPOS_VERTICAL, validarDesactivacion, type TipoVertical } from "../../domain/capacidades.js"
import type { IActivadorVertical, ILectorVerticales } from "../../domain/ports/IActivadorVertical.js"

export class ObtenerCapacidadesUseCase {
  constructor(private readonly lector: ILectorVerticales) {}

  async ejecutar(tenantId: string) {
    const activas = await this.lector.verticalesActivas(tenantId)
    return { data: TIPOS_VERTICAL.map((tipo) => ({ tipo, activa: activas.includes(tipo) })) }
  }
}

export class CambiarCapacidadUseCase {
  constructor(
    private readonly lector: ILectorVerticales,
    private readonly obtenerActivador: (tipo: TipoVertical) => IActivadorVertical | null,
  ) {}

  async ejecutar(input: { tenantId: string; actorUserId: string; tipo: TipoVertical; activa: boolean }) {
    const { tenantId, actorUserId, tipo, activa } = input
    const activas = await this.lector.verticalesActivas(tenantId)
    const resultado = { tipo, activa }

    if (activas.includes(tipo) === activa) return resultado
    if (!activa) validarDesactivacion(activas, tipo)

    const activador = this.obtenerActivador(tipo)
    if (!activador) throw new Error(`No hay un activador registrado para la vertical ${tipo}`)

    if (activa) await activador.activar(tenantId, actorUserId)
    else await activador.desactivar(tenantId, actorUserId)
    return resultado
  }
}
