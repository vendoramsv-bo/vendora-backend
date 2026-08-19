import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

/**
 * Todo `include` y todo create anidado nombra una relación que **existe**.
 *
 * ## Por qué existe este test
 *
 * En un solo módulo aparecieron tres veces el mismo defecto, y las tres veces
 * costó una operación entera del producto:
 *
 * | Repositorio | Usaba | La relación es | Qué rompía |
 * |---|---|---|---|
 * | `caja.prisma.repository` | `ingresosCaja`, `egresosCaja` | `ingresosDeCaja`, `egresosDeCaja` | abrir, cerrar y obtener una caja → 500 |
 * | `venta.prisma.repository` | `ventaDetalle` | `ventasDetalle` | **crear una venta** → 500 |
 * | `pedido.prisma.repository` | `pedidoDetalle`, `ventaDetalle` | `pedidosDetalle`, `ventasDetalle` | crear pedido y convertirlo en venta → 500 |
 *
 * Ninguno lo detectó nada: los repositorios reciben `db: any`, así que
 * TypeScript no compara contra el cliente generado, y los 312 tests del backend
 * pasaban con la creación de ventas completamente rota — porque ninguno llega a
 * ejecutar un `create` real.
 *
 * El modo de fallo es el peor: **no falla al compilar ni al testear, falla en
 * producción con la primera venta.** Y el mensaje de Prisma llega al cliente
 * como un 500 opaco.
 *
 * Este test lee los `.prisma` y los repositorios como texto. No necesita base de
 * datos ni cliente generado, así que corre siempre y es rápido.
 */

const RAIZ = resolve(__dirname, "../..")
const DIR_PRISMA = join(RAIZ, "prisma")
const DIR_MODULOS = join(RAIZ, "src", "modules")

/** `modelo → { campo → tipo }` de todas las relaciones declaradas. */
function relacionesPorModelo(): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>()

  for (const archivo of readdirSync(DIR_PRISMA).filter((f) => f.endsWith(".prisma"))) {
    const texto = readFileSync(join(DIR_PRISMA, archivo), "utf-8")
    for (const bloque of texto.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
      const modelo = bloque[1]!
      const campos = mapa.get(modelo) ?? new Set<string>()
      // Una relación es un campo cuyo tipo es otro modelo (lista u objeto).
      for (const linea of bloque[2]!.split("\n")) {
        const m = linea.match(/^\s+(\w+)\s+(\w+)(\[\])?\s*(\?)?/)
        if (m) campos.add(m[1]!)
      }
      mapa.set(modelo, campos)
    }
  }
  return mapa
}

/** Todos los nombres de campo de todos los modelos: el universo de lo válido. */
function todosLosCampos(): Set<string> {
  const todos = new Set<string>()
  for (const campos of relacionesPorModelo().values()) {
    for (const c of campos) todos.add(c)
  }
  return todos
}

function repositorios(): { archivo: string; ruta: string; texto: string }[] {
  const salida: { archivo: string; ruta: string; texto: string }[] = []
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name)
      if (entrada.isDirectory()) recorrer(ruta)
      else if (entrada.name.endsWith(".prisma.repository.ts")) {
        salida.push({ archivo: entrada.name, ruta, texto: readFileSync(ruta, "utf-8") })
      }
    }
  }
  recorrer(DIR_MODULOS)
  return salida
}

/**
 * Palabras del propio Prisma, no nombres de relación.
 *
 * Aparecen dentro de un `include` anidado —`include: { producto: { select: … } }`—
 * y confundirlas con relaciones llena el test de falsos positivos.
 */
const OPERADORES_PRISMA = new Set([
  "include",
  "select",
  "where",
  "orderBy",
  "take",
  "skip",
  "cursor",
  "distinct",
  "by",
  "having",
  "data",
  "create",
  "connect",
  "connectOrCreate",
  "update",
  "upsert",
  "delete",
  "set",
  "_count",
  "_sum",
  "_avg",
  "_min",
  "_max",
])

/**
 * Claves que aparecen dentro de un `include: { … }`.
 *
 * Es donde se manifiesta el defecto: Prisma rechaza una clave desconocida en un
 * `include` con *"Unknown argument"*, y ese es el 500 que llega al cliente.
 *
 * Solo se miran los `include` de **un nivel** —`{ … }` sin llaves anidadas—,
 * que es donde estuvieron los tres errores reales. Cubrir anidamiento arbitrario
 * pediría parsear TypeScript, y un test que pide un parser deja de correrse.
 */
function clavesDeInclude(texto: string): { clave: string; linea: number }[] {
  const salida: { clave: string; linea: number }[] = []
  for (const m of texto.matchAll(/include:\s*\{([^{}]*)\}/g)) {
    for (const c of m[1]!.matchAll(/(\w+)\s*:\s*true/g)) {
      const clave = c[1]!
      if (OPERADORES_PRISMA.has(clave)) continue
      salida.push({
        clave,
        linea: texto.slice(0, m.index! + c.index!).split("\n").length,
      })
    }
  }
  return salida
}

describe("los repositorios nombran relaciones que existen", () => {
  const campos = todosLosCampos()
  const repos = repositorios()

  it("hay repositorios que auditar", () => {
    expect(repos.length).toBeGreaterThan(0)
  })

  it.each(repos.map((r) => [r.archivo, r] as const))(
    "%s: toda clave de `include` es un campo declarado",
    (_nombre, repo) => {
      const desconocidas = clavesDeInclude(repo.texto)
        .filter(({ clave }) => !campos.has(clave))
        .map(({ clave, linea }) => `${clave} (línea ${linea})`)

      expect(desconocidas, `claves que Prisma rechazaría con "Unknown argument"`).toEqual([])
    },
  )

  it("las relaciones del módulo ventas están en plural, como el schema", () => {
    // Los tres nombres exactos que estuvieron mal. Un test explícito además del
    // genérico: si alguien renombra el schema, este dice cuál era la intención.
    const esquema = readFileSync(join(DIR_PRISMA, "50-ventas.prisma"), "utf-8")
    for (const relacion of [
      "ventasDetalle",
      "pedidosDetalle",
      "ingresosDeCaja",
      "egresosDeCaja",
    ]) {
      expect(esquema, `${relacion} debería estar declarada`).toContain(relacion)
    }

    for (const { archivo, texto } of repos) {
      // Sin comentarios: los de arriba **explican** el defecto y nombran los
      // singulares a propósito. Compararlos sería castigar la documentación.
      const codigo = sinComentarios(texto)

      for (const malo of ["ventaDetalle", "pedidoDetalle"]) {
        expect(codigo, `${archivo} usa ${malo}`).not.toMatch(new RegExp(`\\b${malo}\\b`))
      }

      // `tx.ingresosCaja.create(...)` **sí es válido** —es el delegate del
      // modelo `IngresosCaja`—; lo inválido es usarlo como clave de relación.
      for (const malo of ["ingresosCaja", "egresosCaja"]) {
        expect(
          codigo.match(new RegExp(`\\b${malo}\\s*:`)),
          `${archivo} usa ${malo} como clave de relación`,
        ).toBeNull()
      }
    }
  })
})

/** Quita comentarios de bloque y de línea, para comparar solo código. */
function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
}
