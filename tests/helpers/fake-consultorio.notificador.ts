import type {
  IConsultorioNotificador,
  CitaEventoPayload,
  CitaEstadoPayload,
  AtencionEstadoPayload,
  RecetaEmitidaPayload,
  HistoriaCreadePayload,
} from "../../src/modules/consultorio/domain/ports/IConsultorioNotificador.js"

export class FakeConsultorioNotificador implements IConsultorioNotificador {
  eventos: { tipo: string; payload: unknown }[] = []

  citaCreada(_tenantId: string, payload: CitaEventoPayload): void {
    this.eventos.push({ tipo: "consultorio:cita:creada", payload })
  }

  citaCambiada(_tenantId: string, payload: CitaEstadoPayload): void {
    this.eventos.push({ tipo: "consultorio:cita:estadoCambiado", payload })
  }

  atencionCambiada(_tenantId: string, payload: AtencionEstadoPayload): void {
    this.eventos.push({ tipo: "consultorio:atencion:estadoCambiado", payload })
  }

  recetaEmitida(_tenantId: string, payload: RecetaEmitidaPayload): void {
    this.eventos.push({ tipo: "consultorio:receta:emitida", payload })
  }

  async historiaCreada(payload: HistoriaCreadePayload): Promise<void> {
    this.eventos.push({ tipo: "consultorio:historia:created", payload })
  }

  limpiar(): void {
    this.eventos = []
  }

  tieneEvento(tipo: string): boolean {
    return this.eventos.some((e) => e.tipo === tipo)
  }
}
