import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * La autoría se firma con `TenantMember.id`, **no** con `User.id`.
 *
 * Defecto encontrado al implementar el alcance de la 023: ocho sitios de
 * escritura guardaban `tenantMemberId: session.user.id`. El campo es una clave
 * foránea a `TenantMember.id` (`prisma/50-ventas.prisma`), así que el valor
 * guardado no era el que el campo dice guardar.
 *
 * Por qué importa para esta feature: el alcance filtra
 * `where: { tenantMemberId }` con el `TenantMember.id` de la sesión. Contra
 * filas que guardan un `User.id`, **la igualdad nunca se cumple** y todo rol
 * operativo vería su panel en cero para siempre — un fallo silencioso, sin
 * error, exactamente del tipo que la tabla de quickstart §5 enumera.
 *
 * El valor correcto lo deja `resolverMiembroActivo` en el contexto.
 */

const RAIZ = path.resolve(__dirname, "..", "..", "..")

const ESCRITURAS = [
  "src/modules/ventas/adapters/venta.rest.ts",
  "src/modules/ventas/adapters/caja.rest.ts",
  "src/modules/ventas/adapters/gastos.rest.ts",
  "src/modules/ventas/adapters/pedido.rest.ts",
  "src/modules/almacen/adapters/almacen-operaciones.rest.ts",
  "src/modules/almacen/adapters/receta.rest.ts",
]

describe("autoría — tenantMemberId guarda el TenantMember.id", () => {
  it.each(ESCRITURAS)("%s no vuelve a guardar el User.id", (rel) => {
    const fuente = fs.readFileSync(path.join(RAIZ, rel), "utf8")
    expect(fuente).not.toContain("tenantMemberId: session.user.id")
  })

  it.each(ESCRITURAS)("%s toma la autoría del contexto", (rel) => {
    const fuente = fs.readFileSync(path.join(RAIZ, rel), "utf8")
    expect(fuente).toContain('tenantMemberId: c.get("miembro").id')
  })

  it("los routers que escriben autoría montan resolverMiembroActivo", () => {
    // Sin el middleware montado, `c.get("miembro")` es undefined y la escritura
    // revienta en runtime en vez de guardar mal en silencio.
    for (const rel of [
      "src/modules/ventas/adapters/ventas-router.ts",
      "src/modules/almacen/adapters/almacen-router.ts",
    ]) {
      const fuente = fs.readFileSync(path.join(RAIZ, rel), "utf8")
      expect(fuente).toContain("resolverMiembroActivo")
    }
  })
})
