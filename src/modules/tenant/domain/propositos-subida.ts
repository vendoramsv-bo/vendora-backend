export interface PropositoSubida {
  tiposMimePermitidos: readonly string[]
  tamanoMaximoBytes: number
  carpeta: string
}

const MB = 1024 * 1024

const TIPOS_MIME_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const

// Registro extensible de propósitos de subida (FR-010). Agregar un propósito
// nuevo = agregar una entrada acá; no cambia la forma del request/response.
export const PROPOSITOS_SUBIDA = {
  logo: {
    tiposMimePermitidos: TIPOS_MIME_IMAGEN,
    tamanoMaximoBytes: 2 * MB,
    carpeta: "logoTenant",
  },
  "equipo-foto": {
    tiposMimePermitidos: TIPOS_MIME_IMAGEN,
    tamanoMaximoBytes: 2 * MB,
    carpeta: "fotosEquipo",
  },
  "catalogo-imagen": {
    tiposMimePermitidos: TIPOS_MIME_IMAGEN,
    tamanoMaximoBytes: 5 * MB,
    carpeta: "imagenesProductos",
  },
  "catalogo-galeria": {
    tiposMimePermitidos: TIPOS_MIME_IMAGEN,
    tamanoMaximoBytes: 5 * MB,
    carpeta: "galeriaProductos",
  },
  propietario: {
    tiposMimePermitidos: TIPOS_MIME_IMAGEN,
    tamanoMaximoBytes: 2 * MB,
    carpeta: "fotoPropietario",
  },
  "imagen-local": {
    tiposMimePermitidos: TIPOS_MIME_IMAGEN,
    tamanoMaximoBytes: 5 * MB,
    carpeta: "imagenesLocal",
  },
} satisfies Record<string, PropositoSubida>

export type TipoSubida = keyof typeof PROPOSITOS_SUBIDA

export function esTipoSubidaValido(tipo: string): tipo is TipoSubida {
  return tipo in PROPOSITOS_SUBIDA
}
