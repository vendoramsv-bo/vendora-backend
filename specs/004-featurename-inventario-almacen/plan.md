# Implementation Plan: Inventario y Almacén

**Branch**: `004-featurename-inventario-almacen` | **Date**: 2026-05-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-featurename-inventario-almacen/spec.md`

---

## Summary

Implementar el control de inventario de productos (por variante, con ajustes y recuentos físicos) y el almacén de insumos (gestión, ingresos con proveedor/lote, salidas, recuento y recetas por producto/variante) del tenant. Todo cambio de stock emite notificaciones Socket.IO en tiempo real a los usuarios del mismo tenant. El módulo vive en `src/modules/almacen/` sobre el schema PostgreSQL `almacen` ya definido, sin guard de vertical (núcleo compartido).

---

## Technical Context

**Language/Version**: TypeScript strict / Node.js LTS 20+
**Primary Dependencies**: Hono, @hono/zod-openapi, Prisma 7, Socket.IO, Zod, Vitest, Pino
**Storage**: PostgreSQL — schema `almacen` (40-almacen.prisma) + modificaciones en `catalogo` (30-catalogo.prisma)
**Testing**: Vitest + fakes en memoria (unit) · Testcontainers + PostgreSQL real (integration, fuera de scope de este plan)
**Target Platform**: Render (serverful Node.js — no serverless)
**Project Type**: Módulo del monolito modular hexagonal VENDORA
**Performance Goals**: Notificaciones < 2s (SC-003) · Consultas < 3s en 12 meses de historial (SC-004)
**Constraints**: Tenant isolation estricto · Stock en `ProductoVariante` (no tabla separada) · Decimal para cantidades de insumos
**Scale/Scope**: Hasta 1.000 insumos y 10.000 movimientos/mes por tenant (SC-007)

---

## Constitution Check

| Artículo | Verificación | Estado |
|----------|-------------|--------|
| I — Stack | Hono + Prisma 7 + Socket.IO + Zod + Vitest | ✅ PASS |
| II.1 — Módulo | `src/modules/almacen/` es módulo del núcleo compartido; estructura hexagonal completa | ✅ PASS |
| II.2 — Hexagonal | domain/ → application/ → infrastructure/ → adapters/ sin violaciones | ✅ PASS |
| II.3 — Agnóstico | Los casos de uso no conocen Hono ni Socket.IO | ✅ PASS |
| III — Multi-tenancy | Todo filtrado por `tenantId`; `ProductoVariante.inventarioActivado` verifica pertenencia | ✅ PASS |
| IV — Queries | `makeQueryParamsSchema + toPrismaArgs + paginate` en todos los listados | ✅ PASS |
| V.1 — Schema | `@@schema("almacen")` en todos los modelos; `@@schema("catalogo")` para modificaciones | ✅ PASS |
| V.2 — Nomenclatura | Nombres en español; modelos y campos en español | ✅ PASS |
| VI — Tiempo Real | Eventos emitidos desde casos de uso vía `IAlmacenNotificador`; sala `tenant:${tenantId}` | ✅ PASS |
| VII — Auth | `requireAuth + requireTenantActivo`; `requireRol(["PROPIETARIO","ADMIN"])` en escritura | ✅ PASS |
| VIII — Testing | Unit tests con fakes en memoria para todos los casos de uso con lógica no trivial | ✅ PASS |
| IX — Convenciones | Dominio en español; errores en `*.errors.ts`; adaptadores delgados | ✅ PASS |

**Sin violations. Sin Complexity Tracking requerido.**

---

## Project Structure

### Documentation (this feature)

```text
specs/004-featurename-inventario-almacen/
├── plan.md              ← este archivo
├── research.md          ← decisiones arquitectónicas
├── data-model.md        ← entidades y modificaciones al schema
├── quickstart.md        ← escenarios de integración
├── contracts/
│   ├── rest-api.md      ← endpoints HTTP
│   └── socket-events.md ← eventos Socket.IO
└── tasks.md             ← generado por /speckit-tasks
```

### Schema Modifications (Prisma)

#### `prisma/30-catalogo.prisma` — modificaciones a `ProductoVariante`
```prisma
model ProductoVariante {
  // Agregar:
  inventarioActivado Boolean @default(false)
  // Relación nueva:
  productosInsumoVariante ProductoInsumo[]
}
```

#### `prisma/40-almacen.prisma` — modificaciones

1. `MovimientoInventario`: agregar `stockAntes Int @default(0)`, `stockDespues Int @default(0)`, `createdById String?`
2. `AjusteDetalle`: agregar `stockDespues Int @default(0)`
3. `MovimientoAlmacen`: agregar `stockAntes Int @default(0)`, `stockDespues Int @default(0)`, `createdById String?`
4. `ProductoInsumo`: agregar `varianteId String?`, relación `variante ProductoVariante?`, cambiar `cantidad Int` a `cantidad Decimal @db.Decimal(10,4)`, actualizar unique a `@@unique([productoId, varianteId, insumoId])`

### Source Code (módulo nuevo)

```text
src/modules/almacen/
├── domain/
│   ├── almacen.errors.ts         ← errores de dominio
│   └── ports/
│       ├── IAlmacenNotificador.ts
│       ├── IInventarioProductoRepository.ts
│       ├── IInsumoRepository.ts
│       ├── IIngresoAlmacenRepository.ts
│       ├── ISalidaAlmacenRepository.ts
│       ├── IRecuentoAlmacenRepository.ts
│       └── IRecetaProductoRepository.ts
├── application/
│   ├── inventario/
│   │   ├── inicializar-variante.usecase.ts
│   │   ├── obtener-stock.usecase.ts
│   │   ├── registrar-ajuste.usecase.ts
│   │   ├── listar-ajustes.usecase.ts
│   │   ├── registrar-recuento.usecase.ts
│   │   ├── listar-recuentos.usecase.ts
│   │   └── listar-movimientos-variante.usecase.ts
│   ├── insumo/
│   │   ├── listar-insumos.usecase.ts
│   │   ├── crear-insumo.usecase.ts
│   │   ├── obtener-insumo.usecase.ts
│   │   ├── actualizar-insumo.usecase.ts
│   │   ├── cambiar-estado-insumo.usecase.ts
│   │   ├── eliminar-insumo.usecase.ts
│   │   ├── registrar-ajuste-insumo.usecase.ts
│   │   └── listar-movimientos-insumo.usecase.ts
│   ├── almacen/
│   │   ├── crear-ingreso.usecase.ts
│   │   ├── listar-ingresos.usecase.ts
│   │   ├── crear-salida.usecase.ts
│   │   ├── listar-salidas.usecase.ts
│   │   ├── registrar-recuento-almacen.usecase.ts
│   │   └── listar-recuentos-almacen.usecase.ts
│   ├── receta/
│   │   ├── obtener-receta.usecase.ts
│   │   ├── definir-receta.usecase.ts
│   │   └── eliminar-receta.usecase.ts
│   └── consumo/
│       └── registrar-consumo.usecase.ts
├── infrastructure/
│   ├── null-almacen.notificador.ts
│   ├── almacen.socket.notificador.ts
│   ├── almacen.notificador.provider.ts
│   ├── inventario-producto.prisma.repository.ts
│   ├── insumo.prisma.repository.ts
│   ├── ingreso-almacen.prisma.repository.ts
│   ├── salida-almacen.prisma.repository.ts
│   ├── recuento-almacen.prisma.repository.ts
│   └── receta-producto.prisma.repository.ts
└── adapters/
    ├── almacen.schema.ts          ← schemas Zod
    ├── inventario.rest.ts         ← /variantes/:id/stock, /ajustes, /recuentos
    ├── insumo.rest.ts             ← /insumos/**
    ├── almacen-operaciones.rest.ts ← /ingresos, /salidas, /recuentos-almacen
    ├── receta.rest.ts             ← /productos/:id/receta, /variantes/:id/receta
    ├── consumo.rest.ts            ← /consumo
    └── almacen-router.ts          ← Hono app con requireAuth + requireTenantActivo

tests/
├── helpers/
│   ├── fake-almacen-notificador.ts
│   ├── fake-inventario-producto.repository.ts
│   ├── fake-insumo.repository.ts
│   └── fake-receta-producto.repository.ts
└── unit/
    ├── inicializar-variante.usecase.test.ts
    ├── registrar-ajuste.usecase.test.ts
    ├── registrar-recuento.usecase.test.ts
    ├── crear-insumo.usecase.test.ts
    ├── cambiar-estado-insumo.usecase.test.ts
    ├── crear-ingreso-almacen.usecase.test.ts
    ├── definir-receta.usecase.test.ts
    └── registrar-consumo.usecase.test.ts
```

---

## Key Implementation Patterns

### 1. Errores de dominio (`almacen.errors.ts`)

```typescript
// Inventario de productos
VarianteNoEncontrada        → 404
VarianteNoInicializada      → 422
VarianteYaInicializada      → 409
// Insumos
InsumoNoEncontrado          → 404
InsumoNombreDuplicado       → 409
InsumoEnUsoEnReceta         → 422 (con lista productoIds afectados)
InsumoVencido               → header X-Warning (no bloquea)
// Operaciones
StockInsuficiente           → 422 (solo cuando forzar=false)
DetalleVacio                → 400
MotivoRequerido             → 400
// Almacén
ProveedorNoEncontrado       → 404
```

### 2. `IAlmacenNotificador` port

```typescript
interface IAlmacenNotificador {
  stockCritico(tenantId: string, payload: StockCriticoPayload): void
  stockNormalizado(tenantId: string, payload: StockNormalizadoPayload): void
  insumoStockCritico(tenantId: string, payload: InsumoStockCriticoPayload): void
  insumoStockNormalizado(tenantId: string, payload: InsumoStockNormalizadoPayload): void
}
```

Patrón Provider idéntico a `ICatalogoNotificador`:
- `NullAlmacenNotificador` (no-op)
- `AlmacenSocketNotificador` (io.to(`tenant:${tenantId}`).emit)
- `getAlmacenNotificador()` / `setAlmacenNotificador(n)` en provider

### 3. Lógica crítica en casos de uso

**`RegistrarAjusteUseCase`**:
1. Obtener todas las variantes del detalle (verificar `inventarioActivado = true`)
2. Para cada detalle: `stockAntes = cantidadStock actual`, calcular `stockDespues`
3. Crear `AjusteInventario` + `AjusteDetalle[]` + `MovimientoInventario[]` en `$transaction`
4. Actualizar `ProductoVariante.cantidadStock` en la misma `$transaction`
5. Post-transacción: para cada variante, comparar `stockAntes` vs `stockDespues` vs `stockMinimo` → emitir evento si corresponde

**`RegistrarConsumoUseCase`**:
1. Verificar `inventarioActivado` de la variante
2. Buscar receta: primero a nivel de variante, luego a nivel de producto
3. Si hay receta: calcular cantidades de insumos (`cantidad * unidades`)
4. Si hay insumos insuficientes y `forzar = false` → lanzar `StockInsuficiente`
5. `$transaction`: decrementar `cantidadStock` variante + decrementar `cantidadStock` de cada insumo + crear movimientos
6. Emitir eventos de stock crítico si corresponde para variante e insumos

**`CambiarEstadoInsumoUseCase`**:
1. Verificar que no esté referenciado en `ProductoInsumo` con `productoId` de producto activo
2. Si está en uso → lanzar `InsumoEnUsoEnReceta` con lista de productoIds
3. Actualizar estado

**`DefinirRecetaUseCase`**:
1. Verificar que el producto existe
2. Si `varianteId` presente: verificar que variante pertenece al producto
3. Verificar que todos los `insumoId` existen y están activos en el tenant
4. Upsert en `$transaction`: eliminar líneas anteriores para `(productoId, varianteId)` + crear nuevas

### 4. `almacen-router.ts`

```typescript
import { Hono } from "hono"
import { requireAuth, requireTenantActivo } from "../../../core/hono-context.js"

const almacenApp = new Hono<HonoEnv>()
almacenApp.use("*", requireAuth, requireTenantActivo)
almacenApp.route("/", inventarioRouter)
almacenApp.route("/", insumoRouter)
almacenApp.route("/", almacenOperacionesRouter)
almacenApp.route("/", recetaRouter)
almacenApp.route("/", consumoRouter)
export { almacenApp }
```

Registrar en `src/server/hono.ts`:
```typescript
app.route("/api/almacen", almacenApp)
```

Registrar notificador en `src/server/index.ts`:
```typescript
const almacenNotificador = new AlmacenSocketNotificador(io)
setAlmacenNotificador(almacenNotificador)
```

### 5. Patrón de cantidad decimal en recetas

`ProductoInsumo.cantidad` cambia de `Int` a `Decimal(10,4)` para soportar fracciones (0.1 kg, 0.05 kg). El cálculo de consumo usa `Decimal.js` o las operaciones de Prisma Decimal.

### 6. Detección de estado crítico

```typescript
function evaluarStockCritico(stockAntes: number, stockDespues: number, stockMinimo: number): "critico" | "normalizado" | null {
  if (stockAntes >= stockMinimo && stockDespues < stockMinimo) return "critico"
  if (stockAntes < stockMinimo && stockDespues >= stockMinimo) return "normalizado"
  return null
}
```

---

## Complexity Tracking

No hay violaciones constitucionales. Sin entradas requeridas.

---

## Post-Constitution Check (post-Phase 1 design)

| Verificación | Estado |
|-------------|--------|
| Modelos en schema `almacen` con `@@schema("almacen")` | ✅ |
| Modificaciones a `catalogo` mínimas (solo `inventarioActivado` + relación `ProductoInsumo`) | ✅ |
| Eventos emitidos desde application/, no adapters/ | ✅ |
| Todos los endpoints tienen Zod validation antes de llegar al use case | ✅ |
| Paginación uniforme en todos los listados | ✅ |
| Tenant isolation verificado en todos los repositorios | ✅ |
