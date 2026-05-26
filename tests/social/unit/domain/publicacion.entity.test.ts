import { describe, it, expect } from "vitest"
import { PublicacionEntity } from "../../../../src/modules/social/domain/publicacion.entity.js"
import { EstadoPublicacionInvalido } from "../../../../src/modules/social/domain/social.errors.js"

function makeRaw(estado: string) {
  return {
    id: "pub-1",
    tenantId: "tenant-1",
    autorId: "user-1",
    titulo: "Test",
    contenido: null,
    tipo: "TEXTO",
    estado,
    etiquetas: [],
    publicadoEn: null,
    createdAt: new Date(),
    updatedAt: null,
    medios: [],
  }
}

describe("PublicacionEntity — máquina de estados", () => {
  it("BORRADOR → PUBLICADO es válido", () => {
    const pub = new PublicacionEntity(makeRaw("BORRADOR"))
    expect(() => pub.validarTransicion("PUBLICADO")).not.toThrow()
  })

  it("PUBLICADO → ARCHIVADO es válido", () => {
    const pub = new PublicacionEntity(makeRaw("PUBLICADO"))
    expect(() => pub.validarTransicion("ARCHIVADO")).not.toThrow()
  })

  it("BORRADOR → ARCHIVADO no es válido", () => {
    const pub = new PublicacionEntity(makeRaw("BORRADOR"))
    expect(() => pub.validarTransicion("ARCHIVADO")).toThrowError(EstadoPublicacionInvalido)
  })

  it("ARCHIVADO → PUBLICADO no es válido", () => {
    const pub = new PublicacionEntity(makeRaw("ARCHIVADO"))
    expect(() => pub.validarTransicion("PUBLICADO")).toThrowError(EstadoPublicacionInvalido)
  })

  it("PUBLICADO → BORRADOR no es válido", () => {
    const pub = new PublicacionEntity(makeRaw("PUBLICADO"))
    expect(() => pub.validarTransicion("BORRADOR")).toThrowError(EstadoPublicacionInvalido)
  })

  it("esBorrador() y estaPublicada() reflejan estado correctamente", () => {
    expect(new PublicacionEntity(makeRaw("BORRADOR")).esBorrador()).toBe(true)
    expect(new PublicacionEntity(makeRaw("PUBLICADO")).estaPublicada()).toBe(true)
    expect(new PublicacionEntity(makeRaw("ARCHIVADO")).esBorrador()).toBe(false)
  })
})
