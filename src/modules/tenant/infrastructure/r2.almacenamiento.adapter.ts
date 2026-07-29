import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type {
  EmitirUrlSubidaInput,
  EmitirUrlSubidaResultado,
  IAlmacenamientoPort,
} from "../domain/ports/IAlmacenamientoPort.js"

export interface R2AlmacenamientoAdapterConfig {
  s3: S3Client
  bucket: string
  publicBaseUrl: string
}

export class R2AlmacenamientoAdapter implements IAlmacenamientoPort {
  constructor(private readonly config: R2AlmacenamientoAdapterConfig) {}

  async emitirUrlSubida(input: EmitirUrlSubidaInput): Promise<EmitirUrlSubidaResultado> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: input.key,
      ContentType: input.contentType,
    })

    const uploadUrl = await getSignedUrl(this.config.s3, command, {
      expiresIn: input.expiresInSeconds,
    })

    return {
      uploadUrl,
      publicUrl: `${this.config.publicBaseUrl}/${input.key}`,
    }
  }
}
