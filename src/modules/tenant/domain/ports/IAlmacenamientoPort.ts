export interface EmitirUrlSubidaInput {
  key: string
  contentType: string
  expiresInSeconds: number
}

export interface EmitirUrlSubidaResultado {
  uploadUrl: string
  publicUrl: string
}

export interface IAlmacenamientoPort {
  emitirUrlSubida(input: EmitirUrlSubidaInput): Promise<EmitirUrlSubidaResultado>
}
