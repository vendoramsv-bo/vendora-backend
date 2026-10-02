import type { Prisma } from "../../../generated/prisma/client.js"
import type {
  IMovimientoTenantRepository,
  QueryParamsMovimientosTenant,
} from "../domain/ports/IMovimientoTenantRepository.js"
import type { MovimientoTenant, OrigenMovimiento, TipoMovimientoTenant } from "../domain/movimiento-tenant.js"
import { construirConsultaMovimientosTenant } from "./movimiento-tenant.sql.js"

interface FilaMovimiento {
  id: string
  origen: OrigenMovimiento
  insumoId: string | null
  productoId: string | null
  varianteId: string | null
  nombreEntidad: string
  etiquetaVariante: string | null
  tipo: TipoMovimientoTenant
  cantidad: Prisma.Decimal | number | string
  stockAntes: number
  stockDespues: number
  motivo: string | null
  referenciaId: string | null
  createdAt: Date
}

interface QueryRawClient {
  $queryRaw<T>(query: Prisma.Sql): Promise<T>
}

export class MovimientoTenantPrismaRepository implements IMovimientoTenantRepository {
  constructor(private readonly db: QueryRawClient) {}

  async listar(tenantId: string, params: QueryParamsMovimientosTenant) {
    const { consulta, conteo } = construirConsultaMovimientosTenant(tenantId, params)
    const [filas, [{ total }]] = await Promise.all([
      this.db.$queryRaw<FilaMovimiento[]>(consulta),
      this.db.$queryRaw<[{ total: number }]>(conteo),
    ])
    return { data: filas.map(aMovimiento), total: Number(total) }
  }
}

function aMovimiento(f: FilaMovimiento): MovimientoTenant {
  return {
    ...f,
    cantidad: Number(f.cantidad),
    createdAt: f.createdAt.toISOString(),
  }
}
