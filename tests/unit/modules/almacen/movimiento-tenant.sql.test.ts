import { describe, it, expect } from "vitest"
import { construirConsultaMovimientosTenant } from "../../../../src/modules/almacen/infrastructure/movimiento-tenant.sql.js"
import type { QueryParamsMovimientosTenant } from "../../../../src/modules/almacen/domain/ports/IMovimientoTenantRepository.js"
import { FiltroInvalidoError } from "../../../../src/modules/almacen/domain/almacen.errors.js"

const TENANT = "tenant-a"
const base: QueryParamsMovimientosTenant = { take: 20, skip: 0, order: "desc" }

const texto = (s: string) => s.replace(/\s+/g, " ").trim()

function construir(params: Partial<QueryParamsMovimientosTenant> = {}) {
  const { consulta, conteo } = construirConsultaMovimientosTenant(TENANT, { ...base, ...params })
  return {
    sql: texto(consulta.text),
    values: consulta.values,
    conteoSql: texto(conteo.text),
    conteoValues: conteo.values,
  }
}

describe("construirConsultaMovimientosTenant", () => {
  it("(a) filtra por tenant en las dos ramas del UNION ALL, siempre como parámetro", () => {
    const { sql, values } = construir()
    expect(sql).toContain("UNION ALL")
    expect(sql.match(/m\."tenantId" = \$\d+/g)).toHaveLength(2)
    expect(values.filter((v) => v === TENANT)).toHaveLength(2)
    expect(sql).not.toContain(TENANT)
  })

  it("une MovimientoAlmacen⋈Insumo y MovimientoInventario⋈Producto, normalizando INGRESO → ENTRADA", () => {
    const { sql } = construir()
    expect(sql).toContain('almacen."MovimientoAlmacen" m JOIN almacen."Insumo" i')
    expect(sql).toContain('almacen."MovimientoInventario" m JOIN catalogo."Producto" p')
    expect(sql).toMatch(/CASE WHEN m\.tipo::text = 'INGRESO' THEN 'ENTRADA' ELSE m\.tipo::text END AS tipo/)
  })

  it("(b) sin orderBy → createdAt DESC con desempate por id", () => {
    expect(construir().sql).toContain('ORDER BY u."createdAt" DESC, u.id DESC')
  })

  it("(c) orderBy/order explícitos, desempate en la misma dirección", () => {
    expect(construir({ orderBy: "cantidad", order: "asc" }).sql).toContain("ORDER BY u.cantidad ASC, u.id ASC")
  })

  it("(d) el filtro por tipo se aplica sobre la columna normalizada del SELECT externo", () => {
    const { sql, values } = construir({ filterField: "tipo", filterOp: "equals", filterValue: "ENTRADA" })
    expect(sql).toMatch(/\) u WHERE u\.tipo = \$\d+/)
    expect(values).toContain("ENTRADA")
  })

  it("filtro por origen", () => {
    const { sql, values } = construir({ filterField: "origen", filterOp: "equals", filterValue: "INSUMO" })
    expect(sql).toMatch(/WHERE u\.origen = \$\d+/)
    expect(values).toContain("INSUMO")
  })

  it("filtro por producto: todos los movimientos de un producto, con o sin variante", () => {
    const { sql, values, conteoSql } = construir({ filterField: "productoId", filterOp: "equals", filterValue: "prod-1" })
    expect(sql).toMatch(/WHERE u\."productoId" = \$\d+/)
    expect(conteoSql).toMatch(/WHERE u\."productoId" = \$\d+/)
    expect(values).toContain("prod-1")
    expect(sql).not.toContain("prod-1")
  })

  it("filtro por producto solo admite igualdad", () => {
    expect(() => construir({ filterField: "productoId", filterOp: "contains", filterValue: "prod" })).toThrow(
      FiltroInvalidoError,
    )
  })

  it("filtros numéricos y de fecha van tipados", () => {
    expect(construir({ filterField: "cantidad", filterOp: "gte", filterValue: "3" }).values).toContain(3)
    const { sql, values } = construir({ filterField: "createdAt", filterOp: "lt", filterValue: "2026-09-30" })
    expect(sql).toMatch(/u\."createdAt" < \$\d+/)
    expect(values.some((v) => v instanceof Date)).toBe(true)
  })

  it("(e) contains → ILIKE con el valor parametrizado y % / _ escapados", () => {
    const { sql, values } = construir({ filterField: "motivo", filterOp: "contains", filterValue: "50%_off" })
    expect(sql).toMatch(/u\.motivo ILIKE \$\d+/)
    expect(values).toContain("%50\\%\\_off%")
  })

  it("startsWith / endsWith", () => {
    expect(construir({ filterField: "motivo", filterOp: "startsWith", filterValue: "Aj" }).values).toContain("Aj%")
    expect(construir({ filterField: "motivo", filterOp: "endsWith", filterValue: "Aj" }).values).toContain("%Aj")
  })

  it("(f) take/skip van como parámetros de LIMIT/OFFSET", () => {
    const { sql, values } = construir({ take: 7, skip: 14 })
    expect(sql).toMatch(/LIMIT \$\d+ OFFSET \$\d+$/)
    expect(values.slice(-2)).toEqual([7, 14])
  })

  it("(g) search busca en motivo y nombreEntidad", () => {
    const { sql, values } = construir({ search: "harina" })
    expect(sql).toMatch(/\(u\.motivo ILIKE \$\d+ OR u\."nombreEntidad" ILIKE \$\d+\)/)
    expect(values.filter((v) => v === "%harina%")).toHaveLength(2)
  })

  it("search y filtro se combinan con AND", () => {
    const { sql } = construir({ search: "x", filterField: "tipo", filterOp: "equals", filterValue: "SALIDA" })
    expect(sql).toMatch(/WHERE \(u\.motivo ILIKE .+\) AND u\.tipo = \$\d+/)
  })

  it("(h) el conteo comparte el WHERE y no lleva ORDER BY ni LIMIT", () => {
    const { conteoSql, conteoValues, values } = construir({ filterField: "tipo", filterOp: "equals", filterValue: "AJUSTE" })
    expect(conteoSql).toMatch(/^SELECT COUNT\(\*\)::int AS total FROM \(/)
    expect(conteoSql).toMatch(/WHERE u\.tipo = \$\d+$/)
    expect(conteoSql).not.toContain("ORDER BY")
    expect(conteoSql).not.toContain("LIMIT")
    expect(conteoValues).toEqual(values.slice(0, -2))
  })

  it("operador incompatible con el campo → FiltroInvalidoError", () => {
    expect(() => construir({ filterField: "cantidad", filterOp: "contains", filterValue: "1" })).toThrow(FiltroInvalidoError)
  })
})
