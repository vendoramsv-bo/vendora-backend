import { describe, it, expect } from "vitest"
import { ListarMovimientosTenantUseCase } from "../../../../src/modules/almacen/application/movimiento/listar-movimientos-tenant.usecase.js"
import type {
  IMovimientoTenantRepository,
  QueryParamsMovimientosTenant,
} from "../../../../src/modules/almacen/domain/ports/IMovimientoTenantRepository.js"
import type { MovimientoTenant } from "../../../../src/modules/almacen/domain/movimiento-tenant.js"

class FakeMovimientoTenantRepository implements IMovimientoTenantRepository {
  llamadas: Array<{ tenantId: string; params: QueryParamsMovimientosTenant }> = []
  constructor(private readonly respuesta: { data: MovimientoTenant[]; total: number }) {}
  async listar(tenantId: string, params: QueryParamsMovimientosTenant) {
    this.llamadas.push({ tenantId, params })
    return this.respuesta
  }
}

const mov = (id: string): MovimientoTenant => ({
  id,
  origen: "INSUMO",
  insumoId: "ins-1",
  productoId: null,
  varianteId: null,
  nombreEntidad: "Harina",
  etiquetaVariante: null,
  tipo: "ENTRADA",
  cantidad: 5,
  stockAntes: 0,
  stockDespues: 5,
  motivo: null,
  referenciaId: null,
  createdAt: "2026-09-30T00:00:00.000Z",
})

describe("ListarMovimientosTenantUseCase", () => {
  it("delega tenantId y params al repositorio sin modificarlos", async () => {
    const repo = new FakeMovimientoTenantRepository({ data: [], total: 0 })
    const params: QueryParamsMovimientosTenant = { take: 10, skip: 20, order: "asc", orderBy: "cantidad" }
    await new ListarMovimientosTenantUseCase(repo).execute("tenant-a", params)
    expect(repo.llamadas).toEqual([{ tenantId: "tenant-a", params }])
  })

  it("envuelve el resultado con la forma de paginate()", async () => {
    const repo = new FakeMovimientoTenantRepository({ data: [mov("a"), mov("b")], total: 5 })
    const r = await new ListarMovimientosTenantUseCase(repo).execute("tenant-a", { take: 2, skip: 2, order: "desc" })
    expect(r).toEqual({
      data: [mov("a"), mov("b")],
      total: 5,
      page: 2,
      take: 2,
      totalPaginas: 3,
      hayPaginaSiguiente: true,
      hayPaginaAnterior: true,
    })
  })

  it("tenant sin movimientos → éxito con colección vacía (FR-010)", async () => {
    const repo = new FakeMovimientoTenantRepository({ data: [], total: 0 })
    const r = await new ListarMovimientosTenantUseCase(repo).execute("tenant-a", { take: 20, skip: 0, order: "desc" })
    expect(r.data).toEqual([])
    expect(r.total).toBe(0)
    expect(r.hayPaginaSiguiente).toBe(false)
  })
})
