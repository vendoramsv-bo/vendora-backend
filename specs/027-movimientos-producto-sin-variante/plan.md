# Implementation Plan: Movimientos de inventario de productos con y sin variante

**Branch**: `027-movimientos-producto-sin-variante` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/027-movimientos-producto-sin-variante/spec.md`

## Summary

Reemplazar las siete escrituras de `MovimientoInventario` que usan `upsert` sobre la
clave compuesta (Prisma rechaza `varianteId: null` en ese `where`) por un único helper
`registrarMovimiento(tx, …)`. El helper:

- inserta con `createMany({ skipDuplicates: true })`, que en SQL es `ON CONFLICT DO NOTHING`;
- respalda la idempotencia con la restricción única convertida a `NULLS NOT DISTINCT`
  (PostgreSQL 17), para que la base también la garantice cuando `varianteId` es nulo;
- **solo mueve el stock si el movimiento se insertó**, y con eso la idempotencia pasa a
  cubrir también el stock. Hoy el reintento de una salida **descuenta dos veces**,
  incluso para variantes.

Además:
- La inicialización deja de filtrar por `Producto.inventarioActivado`, que no existe, y
  deja de pisar el stock de los productos simples.
- Los tres `.catch(() => {})` pasan a esperar el resultado y registrar el error en el log.
- `confirmar` deja de mover el stock de productos y variantes.
- Una línea de venta sin variante, de un producto que tiene variantes, se rechaza con 422.

## Technical Context

**Language/Version**: TypeScript 5.8 strict · Node.js ≥ 20
**Primary Dependencies**: Prisma 7 (`prisma-client` + adapter-pg), Hono, Pino
**Storage**: PostgreSQL 17 (Neon). `almacen."MovimientoInventario"` tiene 0 filas hoy
**Testing**: Vitest. Unit con fakes y **tests de repositorio contra PostgreSQL real** con `describe.skipIf(!DATABASE_URL)`, el patrón que ya usan `tests/consultorio/integration/*`
**Target Platform**: Render, Web Service
**Project Type**: web-service (REST)
**Performance Goals**: sin cambios; una consulta `FOR UPDATE` extra por línea de venta
**Constraints**: todo cambio de stock y su movimiento van en la misma transacción (FR-001); ninguna secuencia de llamadas descuenta dos veces (FR-003, FR-006)
**Scale/Scope**: 1 repositorio (7 escrituras), 3 casos de uso, 2 routers, 1 migración

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Artículo | Evaluación | Estado |
|---|---|---|
| I — Stack | Sin dependencias nuevas | ✅ |
| II — Hexagonal | El helper vive en `almacen/infrastructure`. La regla de la variante requerida se aplica en el caso de uso de `ventas` a través de su repositorio. `ventas` sigue sin importar `almacen`: usa el puerto existente | ✅ |
| III.1 — Aislamiento | Las lecturas de stock dentro de la salida pasan a filtrar por `tenantId` (hoy buscan solo por id) | ✅ mejora |
| V — Datos | Migración que cambia una restricción única; sin columnas nuevas | ✅ |
| VI — Tiempo real | Sin cambios | N/A |
| VIII.1 — Dominio con fakes | Regla de variante requerida y caminos de error de los casos de uso, con fakes | ✅ |
| VIII.2 — Integración con base real | Tests de repositorio contra PostgreSQL real, omitibles sin `DATABASE_URL`. Es el único tipo de test que habría atrapado este defecto: el error lo lanza el cliente Prisma real | ✅ |
| IX.3 — Errores de dominio | `VarianteRequeridaError` en `ventas.errors.ts` → 422 | ✅ |

**Resultado**: sin violaciones.

## Project Structure

### Documentation

```text
specs/027-movimientos-producto-sin-variante/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/movimientos-y-ventas.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
prisma/migrations/<ts>_movimiento_inventario_nulls_not_distinct/migration.sql   # NUEVO

src/modules/almacen/infrastructure/
├── movimiento-inventario.writer.ts           # NUEVO — registrarMovimiento(tx, …) → { insertado }
├── inventario-producto.prisma.repository.ts  # 7 escrituras → helper; inicialización corregida
└── almacen-inventario.port.adapter.ts        # loguea el fallo con contexto y lo relanza

src/modules/ventas/
├── domain/ventas.errors.ts                   # + VarianteRequeridaError
├── domain/ports/IVentaRepository.ts          # + productosQueRequierenVariante
├── infrastructure/venta.prisma.repository.ts # + esa consulta; confirmar sin stock de producto
├── application/venta/crear-venta.usecase.ts           # valida líneas; await de la salida
└── application/pedido/convertir-pedido-en-venta.usecase.ts  # ídem

src/modules/catalogo/adapters/producto.rest.ts         # 2 × .catch(() => {}) → log

tests/
├── integration/almacen/movimientos-sin-variante.test.ts   # NUEVO — base real
└── unit/modules/ventas/crear-venta-variante.test.ts       # NUEVO — fakes
```

## Complexity Tracking

| Desvío | Por qué | Alternativa descartada |
|---|---|---|
| Restricción `NULLS NOT DISTINCT` fuera del lenguaje de Prisma (solo en la migración SQL) | Prisma no puede expresarla, y sin ella la base admite movimientos duplicados con `varianteId` nulo (edge case de la spec) | Índice único parcial `WHERE "varianteId" IS NULL`: dos índices para una sola regla. Deduplicar solo en la aplicación: no resiste dos requests concurrentes |
| `SELECT … FOR UPDATE` con `$queryRaw` dentro de la salida | Que `stockAntes` sea correcto con ventas concurrentes del mismo producto | Leer sin lock: el stock final queda bien (`decrement` es atómico), pero el historial registra `stockAntes` equivocados |
