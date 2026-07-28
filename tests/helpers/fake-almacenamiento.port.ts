import type {
  EmitirUrlSubidaInput,
  EmitirUrlSubidaResultado,
  IAlmacenamientoPort,
} from "../../src/modules/tenant/domain/ports/IAlmacenamientoPort.js"

export class FakeAlmacenamientoPort implements IAlmacenamientoPort {
  readonly llamadas: EmitirUrlSubidaInput[] = []
  readonly eliminaciones: string[] = []

  private static readonly PUBLIC_BASE_URL = "https://cdn.fake.local"

  async emitirUrlSubida(input: EmitirUrlSubidaInput): Promise<EmitirUrlSubidaResultado> {
    this.llamadas.push(input)
    return {
      uploadUrl: `https://fake-r2.local/vendora/${input.key}?firmado=true`,
      publicUrl: `${FakeAlmacenamientoPort.PUBLIC_BASE_URL}/${input.key}`,
    }
  }

  async eliminarArchivo(key: string): Promise<void> {
    this.eliminaciones.push(key)
  }

  extraerKeyDesdeUrlPublica(url: string): string | null {
    const prefix = `${FakeAlmacenamientoPort.PUBLIC_BASE_URL}/`
    if (!url.startsWith(prefix)) return null
    return url.slice(prefix.length)
  }
}
