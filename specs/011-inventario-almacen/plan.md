# Implementation Plan: Inventario de Productos y Almacén de Insumos

**Branch**: `011-inventario-almacen` | **Date**: 2026-05-26 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/011-inventario-almacen/spec.md`

## Summary

El módulo `almacen` ya existe con 49 archivos y una implementación sustancial (insumos, receta, notificador, listar use cases). Esta planificación cubre únicamente las **capacidades faltantes** detectadas al comparar el spec 011 con el código existente:

1. Patrón borrador-aprobación para `AjusteInventario` y `RecuentoInventario` (hoy aplican stock directamente)
2. Patrón borrador-aprobación para `IngresoAlmacen` y `SalidaAlmacen` (hoy aplican stock en el create)
3. Rechazo de stock negativo al aprobar ajustes, recuentos y salidas
4. Bloqueo optimista con campo `version` en los 4 tipos de documento
5. Idempotencia de movimientos vía `upsert` (el `@@unique` ya existe en schema)
6. Auto-inicialización de stock para todos los productos/variantes del tenant
7. Recálculo del stock del producto padre al aprobar ajuste/recuento sobre una variante
8. Integración con Feature 006: movimiento SALIDA automático al registrar una venta
9. Edición de documentos en estado PENDIENTE

## Technical Context

**Language/Version**: TypeScript strict · Node.js 20 LTS  
**Primary Dependencies**: Hono · @hono/zod-openapi · Prisma 7 · Socket.IO · Zod · Vitest  
**Storage**: PostgreSQL — schema `almacen` (`prisma/40-almacen.prisma`) + cross-schema `catalogo` (Producto.cantidadStock, ProductoVariante.cantidadStock/stockMinimo/inventarioActivado)  
**Testing**: Vitest — unit (fakes en memoria) + integration (Testcontainers cuando DATABASE_URL presente)  
**Target Platform**: Render — servidor persistente (WebSocket long-lived)  
**Project Type**: Monolito modular hexagonal — módulo `almacen` existente en `src/modules/almacen/`  
**Performance Goals**: Aprobación atómica < 500 ms p95; listados < 3 s para 12 meses de historial  
**Constraints**: Multi-tenant estricto; stock negativo siempre rechazado en aprobaciones; atomicidad de toda aprobación; bloqueo optimista obligatorio  
**Scale/Scope**: 1.000 insumos · 10.000 movimientos mensuales por tenant

## Constitution Check

| Artículo | Aplica | Estado |
|---|---|---|
| I — Stack (Hono, Prisma 7, Zod, Vitest) | ✅ | PASS — módulo existente ya usa el stack completo |
| II — Hexagonal (domain/application/infrastructure/adapters) | ✅ | PASS — todos los archivos nuevos replican la estructura existente |
| III — Multi-tenancy (`tenantId` en todas las queries) | ✅ | PASS — patrón prismaScoped ya activo; ninguna query escapa del tenant |
| IV — Consultas parametrizables (`makeQueryParamsSchema`) | ✅ | PASS — listados existentes ya usan `toPrismaArgs`; nuevos listar idem |
| V — Schema `almacen` + cross-schema `catalogo` | ✅ | PASS — solo se agregan 5 campos a modelos existentes; no hay nuevos modelos |
| VI — Socket.IO desde `application/` vía puerto `IAlmacenNotificador` | ✅ | PASS — los use cases de aprobación emitirán eventos via el notificador ya inyectado |
| VII — Roles: PROPIETARIO/ADMIN escriben/aprueban; todos leen | ✅ | PASS |
| VIII — Tests unitarios sin infraestructura; integración con DB real | ✅ | PASS — fakes en memoria para unit tests de use cases |
| IX — Código en español; sin lógica en adaptadores | ✅ | PASS |

**Sin violaciones. Sin entradas en Complexity Tracking.**

## Project Structure

### Documentation (this feature)

```text
specs/011-inventario-almacen/
├── plan.md              ← Este archivo
├── research.md          ← Decisiones técnicas y análisis de delta
├── data-model.md        ← Cambios al schema y nuevos puertos
├── quickstart.md        ← Escenarios de validación manual
├── contracts/
│   ├── rest-api.md      ← Contratos REST de nuevas rutas
│   └── socket-events.md ← Contratos de eventos Socket.IO
└── tasks.md             ← Generado por /speckit-tasks
```

### Source Code — Solo Archivos Nuevos o Modificados

```text
prisma/
└── 40-almacen.prisma        ← [MODIFY] +version en 4 modelos, +motivo en SalidaAlmacen

src/modules/almacen/
├── domain/
│   ├── almacen.errors.ts    ← [MODIFY] +StockNegativoError, +ConflictoVersionError,
│   │                                    +DocumentoYaAprobadoError, +DocumentoNoEncontradoError
│   └── ports/
│       ├── IInventarioProductoRepository.ts  ← [MODIFY] reemplazar registrarAjuste/Recuento
│       │                                         por crear/obtener/actualizar/aprobar; +inicializarBulk
│       ├── IIngresoAlmacenRepository.ts      ← [MODIFY] +obtener, +actualizar, +aprobar
│       └── ISalidaAlmacenRepository.ts       ← [MODIFY] +obtener, +actualizar, +aprobar
│
├── application/
│   ├── inventario/
│   │   ├── inicializar-variante.usecase.ts   ← [DELETE] reemplazado por auto-inicializar
│   │   ├── registrar-ajuste.usecase.ts       ← [DELETE] reemplazado por crear+aprobar
│   │   ├── registrar-recuento.usecase.ts     ← [DELETE] reemplazado por crear+aprobar
│   │   ├── auto-inicializar-stock.usecase.ts ← [NEW] FR-020, FR-021
│   │   ├── crear-ajuste.usecase.ts           ← [NEW] crea AjusteInventario PENDIENTE
│   │   ├── obtener-ajuste.usecase.ts         ← [NEW]
│   │   ├── actualizar-ajuste.usecase.ts      ← [NEW] FR-022
│   │   ├── aprobar-ajuste.usecase.ts         ← [NEW] FR-004, FR-006, FR-007, FR-023
│   │   ├── crear-recuento.usecase.ts         ← [NEW]
│   │   ├── obtener-recuento.usecase.ts       ← [NEW]
│   │   ├── actualizar-recuento.usecase.ts    ← [NEW] FR-022
│   │   └── aprobar-recuento.usecase.ts       ← [NEW] FR-005, FR-006, FR-007, FR-023
│   ├── almacen/
│   │   ├── crear-ingreso.usecase.ts          ← [MODIFY] eliminar aplicación de stock; solo crea PENDIENTE
│   │   ├── obtener-ingreso.usecase.ts        ← [NEW]
│   │   ├── actualizar-ingreso.usecase.ts     ← [NEW] FR-022
│   │   ├── aprobar-ingreso.usecase.ts        ← [NEW] FR-012, FR-014, FR-023, FR-024
│   │   ├── crear-salida.usecase.ts           ← [MODIFY] eliminar aplicación de stock; solo crea PENDIENTE
│   │   ├── obtener-salida.usecase.ts         ← [NEW]
│   │   ├── actualizar-salida.usecase.ts      ← [NEW] FR-022
│   │   └── aprobar-salida.usecase.ts         ← [NEW] FR-012, FR-013, FR-014, FR-023, FR-024
│   └── shared/
│       └── evaluar-stock-critico.ts          ← [KEEP] sin cambios
│
├── infrastructure/
│   ├── inventario-producto.prisma.repository.ts  ← [MODIFY] refactor completo: upsert idempotente,
│   │                                                 check negativo, bloqueo optimista, recalcular padre
│   ├── ingreso-almacen.prisma.repository.ts      ← [MODIFY] create no aplica stock; +obtener, +actualizar, +aprobar
│   ├── salida-almacen.prisma.repository.ts       ← [MODIFY] create no aplica stock; +obtener, +actualizar, +aprobar
│   └── almacen-inventario.port.adapter.ts        ← [NEW] implementa IAlmacenInventarioPort para Feature 006
│
└── adapters/
    ├── inventario.rest.ts       ← [MODIFY] eliminar POST directo /ajustes y /recuentos;
    │                                        agregar CRUD+aprobar para ajustes y recuentos;
    │                                        agregar POST /inventario/inicializar
    ├── almacen-operaciones.rest.ts ← [MODIFY] agregar GET/:id, PATCH/:id, POST/:id/aprobar
    │                                           para ingresos y salidas
    └── almacen.schema.ts        ← [MODIFY] agregar Zod schemas para nuevas rutas

src/modules/ventas/
└── domain/ports/
    └── IAlmacenInventarioPort.ts  ← [NEW] puerto para que ventas llame al almacén
    (+ modificación de crear-venta.usecase.ts para llamar al puerto)

tests/almacen/
├── unit/application/
│   ├── aprobar-ajuste.usecase.test.ts      ← [NEW] stock negativo, conflicto versión, éxito
│   ├── aprobar-recuento.usecase.test.ts    ← [NEW]
│   ├── aprobar-ingreso.usecase.test.ts     ← [NEW]
│   ├── aprobar-salida.usecase.test.ts      ← [NEW] stock negativo insumo
│   └── auto-inicializar-stock.usecase.test.ts ← [NEW]
└── integration/
    └── inventario-producto.prisma.repository.test.ts ← [EXTEND] tests de bloqueo optimista e idempotencia
```

## Complexity Tracking

*(Sin violaciones de constitución. Sección vacía.)*
