import type {
  EmitirUrlSubidaInput,
  EmitirUrlSubidaResultado,
  IAlmacenamientoPort,
} from "../../src/modules/tenant/domain/ports/IAlmacenamientoPort.js"

export class FakeAlmacenamientoPort implements IAlmacenamientoPort {
  readonly llamadas: EmitirUrlSubidaInput[] = []

  async emitirUrlSubida(input: EmitirUrlSubidaInput): Promise<EmitirUrlSubidaResultado> {
    this.llamadas.push(input)
    return {
      uploadUrl: `https://fake-r2.local/vendora/${input.key}?firmado=true`,
      publicUrl: `https://cdn.fake.local/${input.key}`,
    }
  }
}
