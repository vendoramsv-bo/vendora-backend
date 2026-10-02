---
description: "Task list for 020-movimientos-inventario-tenant"
---

# Tasks: Movimientos de inventario — listado a nivel tenant y contrato completo

**Input**: `specs/020-movimientos-inventario-tenant/` — plan.md, spec.md, research.md, data-model.md, contracts/movimientos.md, quickstart.md

**Tests**: incluidos. `plan.md` (Project Structure) compromete tres archivos de test concretos.

**Organization**: por historia de usuario. **US2 no depende de US1** y es más chica:
puede entregarse primero (la spec lo sugiere: desbloquea al frontend de inmediato para
los dos listados por entidad).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivo distinto, sin dependencias pendientes)
- **[Story]**: US1 / US2 de `spec.md`

---

## Phase 1: Setup

- [X] T001 Registrar la línea base: correr `npx tsc --noEmit` y `pnpm test` en la rama `020-movimientos-inventario-tenant` y anotar en este archivo (sección Notes) los fallos preexistentes, si los hay, para no confundirlos con regresiones de esta feature

---

## Phase 2: Foundational (bloquea US1 y US2)

- [X] T002 [P] Agregar `paginadoSchema(item: z.ZodTypeAny)` a `src/core/openapi-responses.ts`: devuelve `z.object({ data: z.array(item), total: z.number().int(), page: z.number().int(), take: z.number().int(), totalPaginas: z.number().int(), hayPaginaSiguiente: z.boolean(), hayPaginaAnterior: z.boolean() })`, usando `z` de `@hono/zod-openapi`. Debe coincidir campo por campo con lo que devuelve `paginate()` en `src/core/query-params.ts`
- [X] T003 [P] Test unitario de `convertirValorFiltro` en `tests/unit/modules/almacen/movimiento-filtro.test.ts`: `cantidad` "5" → 5 y "abc" → error; `createdAt` "2026-09-30" → `Date` y "nope" → error; `motivo` pasa el string tal cual
- [X] T004 Crear `src/modules/almacen/domain/movimiento-filtro.ts` con `convertirValorFiltro(campo: "tipo" | "cantidad" | "motivo" | "createdAt" | "origen", valor: string): string | number | Date`, que lanza `FiltroInvalidoError` (en `domain/almacen.errors.ts`, convención del módulo, con `code = "FILTRO_INVALIDO"`) si el valor no se puede convertir. Sin imports de infraestructura (Art. II.1). Hace pasar T003

**Checkpoint**: helpers compartidos listos; US1 y US2 pueden avanzar en paralelo

---

## Phase 3: User Story 1 — Listado de movimientos del tenant (P1) 🎯 MVP

**Goal**: `GET /api/almacen/movimientos` devuelve movimientos de insumos y variantes del tenant autenticado, paginados por offset, del más reciente al más antiguo

**Independent Test**: `quickstart.md` §2–§5

### Tests for User Story 1

> Escribirlos primero y confirmar que fallan

- [X] T005 [P] [US1] Test unitario del builder en `tests/unit/modules/almacen/movimiento-tenant.sql.test.ts` sobre `construirConsultaMovimientosTenant(tenantId, params)` (ver T009). Inspeccionar `.sql` y `.values` del `Prisma.Sql` devuelto y verificar:
  - (a) el `tenantId` aparece como parámetro **dos veces**, una por rama del `UNION ALL`, y nunca interpolado en el texto
  - (b) sin `orderBy` → `ORDER BY "createdAt" DESC, id DESC`
  - (c) `orderBy=cantidad&order=asc` → `ORDER BY cantidad ASC, id ASC`
  - (d) `filterField=tipo&filterOp=equals&filterValue=ENTRADA` → el filtro se aplica sobre la columna normalizada del `SELECT` externo
  - (e) `filterOp=contains` → `ILIKE` con el valor como parámetro y `%`/`_` escapados
  - (f) `take`/`skip` van como parámetros de `LIMIT`/`OFFSET`
  - (g) `search` genera `ILIKE` sobre `motivo` y `"nombreEntidad"`
  - (h) la consulta de conteo comparte el mismo `WHERE` y no lleva `ORDER BY`/`LIMIT`
- [X] T006 [P] [US1] Test unitario de `ListarMovimientosTenantUseCase` en `tests/unit/modules/almacen/listar-movimientos-tenant.usecase.test.ts` con un fake de `IMovimientoTenantRepository`: delega `tenantId` y `params` al repo sin modificarlos, y envuelve el resultado con la forma de `paginate()`; con `{ data: [], total: 0 }` devuelve `data: []`, `total: 0`, `hayPaginaSiguiente: false` (FR-010)

### Implementation for User Story 1

- [X] T007 [P] [US1] Crear `src/modules/almacen/domain/movimiento-tenant.ts` con los tipos `OrigenMovimiento = "INSUMO" | "VARIANTE"`, `TipoMovimientoTenant = "CREACION" | "ENTRADA" | "SALIDA" | "AJUSTE" | "RECUENTO"` y la interfaz `MovimientoTenant` con los campos de `data-model.md` (Vista de lectura). Exportar también las constantes `ORIGENES_MOVIMIENTO` y `TIPOS_MOVIMIENTO_TENANT`, los arrays que usan los `z.enum`
- [X] T008 [P] [US1] Crear el puerto `src/modules/almacen/domain/ports/IMovimientoTenantRepository.ts`: `listar(tenantId: string, params: QueryParamsMovimientosTenant): Promise<{ data: MovimientoTenant[]; total: number }>`. Declarar ahí el tipo `QueryParamsMovimientosTenant` como interfaz de dominio (`take`, `skip`, `orderBy?`, `order`, `search?`, `filterField?`, `filterOp?`, `filterValue?`) para no importar el schema Zod desde `domain/` (depende de T007)
- [X] T009 [US1] Crear `src/modules/almacen/infrastructure/movimiento-tenant.sql.ts` con `construirConsultaMovimientosTenant(tenantId, params): { consulta: Prisma.Sql; conteo: Prisma.Sql }`, función pura con `Prisma.sql`/`Prisma.join` y sin acceso a DB. Según `research.md` §2–§4:
  - Rama insumos: `almacen."MovimientoAlmacen" m JOIN almacen."Insumo" i ON i.id = m."insumoId" WHERE m."tenantId" = ${tenantId}`, con `'INSUMO' AS origen` y `CASE WHEN m.tipo::text = 'INGRESO' THEN 'ENTRADA' ELSE m.tipo::text END AS tipo`
  - Rama variantes: `almacen."MovimientoInventario" m JOIN catalogo."Producto" p ON p.id = m."productoId" WHERE m."tenantId" = ${tenantId}`
  - En ambas ramas, `cantidad::numeric` y los mismos alias que `data-model.md`
  - Mapa fijo de nombres de campo a columna para `orderBy`/`filterField`. Un campo fuera del mapa lanza error (no debería llegar, porque Zod lo filtra antes)
  - El valor del filtro se convierte con `convertirValorFiltro` (T004)
  - `ORDER BY <col> <dir>, id <dir>`, y `LIMIT`/`OFFSET` parametrizados
  - Antes de escribirlo, verificar los nombres reales de tablas y columnas en `prisma/40-almacen.prisma` y `prisma/30-catalogo.prisma` (no hay `@@map`). Hace pasar T005 (depende de T004, T007)
- [X] T010 [US1] Crear `src/modules/almacen/infrastructure/movimiento-tenant.prisma.repository.ts` que implementa `IMovimientoTenantRepository`:
  - Ejecuta `consulta` y `conteo` de T009 con `this.db.$queryRaw` en `Promise.all`
  - Mapea cada fila: `cantidad` a `Number`, `createdAt` a ISO string, `total` del `COUNT` (bigint) a `Number`
  - Recibe el cliente Prisma por constructor, como los otros repos de `almacen/infrastructure` (depende de T008, T009)
- [X] T011 [US1] Crear `src/modules/almacen/application/movimiento/listar-movimientos-tenant.usecase.ts`, siguiendo el patrón de `application/insumo/listar-movimientos-insumo.usecase.ts`: `execute(tenantId, params)` → `paginate(data, total, params)`. Hace pasar T006 (depende de T008)
- [X] T012 [US1] En `src/modules/almacen/adapters/almacen.schema.ts`, agregar:
  - `QueryParamsMovimientosTenantSchema`: `makeQueryParamsSchema(["tipo","cantidad","createdAt"]).extend({ filterField: z.enum(["origen","tipo","motivo","cantidad","createdAt"]).optional() })`
  - `MovimientoTenantSchema` según `contracts/movimientos.md` §1, con `z.enum(TIPOS_MOVIMIENTO_TENANT)` y `z.enum(ORIGENES_MOVIMIENTO)` de T007 (depende de T007)
- [X] T013 [US1] Crear `src/modules/almacen/adapters/movimiento.rest.ts` con `movimientoRouter`, un `GET "/"` con:
  - `operationId: "almacen_listar_movimientos_tenant"`, `tags: ["Almacén"]`, `security: [{ bearerAuth: [] }]`
  - `request: { query: QueryParamsMovimientosTenantSchema }`
  - Respuestas: `200: okResponse("Movimientos de inventario del tenant", paginadoSchema(MovimientoTenantSchema))` y `...errorResponses`
  - Handler delgado: `c.req.valid("query")`, `tenantId` de `c.get("tenantId")`, ejecutar el caso de uso y devolver `c.json(result)`. Si se lanza `FiltroInvalidoError`, responder `400 { error: err.code, message }`
  - El repositorio se construye con el mismo patrón `makeRepo()` que `insumo.rest.ts` (depende de T002, T010, T011, T012)
- [X] T014 [US1] Montar el router en `src/modules/almacen/adapters/almacen-router.ts` con `almacenApp.route("/movimientos", movimientoRouter)`. Verificar que ninguna ruta de `inventarioRouter` ni de `almacenOperacionesRouter` (montados en `/`) responde ya a `GET /movimientos` (depende de T013)
- [X] T015 [US1] Agregar `@@index([tenantId, createdAt])` a `MovimientoInventario` y a `MovimientoAlmacen` en `prisma/40-almacen.prisma`. Generar la migración con `pnpm db:migrate --name movimientos_indice_tenant_fecha`, revisar que el SQL generado solo contenga dos `CREATE INDEX` y correr `pnpm db:generate`
- [X] T016 [US1] Test de contrato en `tests/integration/almacen-movimientos-contrato.test.ts`, siguiendo el patrón de `tests/integration/openapi.test.ts`: `crearApp()` → `GET /api/openapi.json`, y verificar que `/api/almacen/movimientos` existe con `get.operationId === "almacen_listar_movimientos_tenant"`, declara los parámetros de query `take, skip, orderBy, order, search, filterField, filterOp, filterValue`, y su schema 200 tiene `data, total, page, take, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior` (depende de T014)

**Checkpoint**: correr `quickstart.md` §2–§5 contra la DB de desarrollo con dos tenants

---

## Phase 4: User Story 2 — El contrato declara lo que los endpoints ya aceptan (P2)

**Goal**: `/insumos/{id}/movimientos` y `/variantes/{varianteId}/movimientos` publican en OpenAPI su query y su respuesta paginada, sin cambiar lo que responden

**Independent Test**: `quickstart.md` §1 y §6. Además, el cliente generado del frontend puede pasar `take`/`skip`/`orderBy` sin `@ts-ignore`

### Tests for User Story 2

- [X] T017 [US2] En `tests/integration/almacen-movimientos-contrato.test.ts`, agregar casos para `/api/almacen/insumos/{id}/movimientos` y `/api/almacen/variantes/{varianteId}/movimientos`: cada uno declara su parámetro de ruta más los 8 de query, y su schema 200 tiene la forma de `paginadoSchema`. Verificar también que `filterField` está declarado como enum `["tipo","cantidad","motivo","createdAt"]`, no como string libre (FR-013). Si US1 no se hizo todavía, crear el archivo con solo estos casos

### Implementation for User Story 2

- [X] T018 [US2] En `src/modules/almacen/adapters/almacen.schema.ts`:
  - Redefinir `QueryParamsMovimientosSchema` como `makeQueryParamsSchema(["tipo","cantidad","motivo","createdAt"]).extend({ filterField: z.enum(["tipo","cantidad","motivo","createdAt"]).optional() })`
  - Agregar `MovimientoInsumoSchema` y `MovimientoVarianteSchema` según `contracts/movimientos.md` §2–§3. La `cantidad` del insumo va como `z.string()`, porque es el `Decimal` serializado tal cual responde hoy
  - Antes, confirmar con un `GET` real o con el tipo generado de Prisma que los campos declarados son exactamente los que devuelve el `findMany` sin `select`
- [X] T019 [US2] En `src/modules/almacen/adapters/insumo.rest.ts` (ruta `GET /{id}/movimientos`, hoy línea ~246):
  - `request: { params: z.object({ id: z.string() }), query: QueryParamsMovimientosSchema }`
  - Respuesta `200: okResponse("Movimientos del insumo", paginadoSchema(MovimientoInsumoSchema))`
  - En el handler, reemplazar `QueryParamsMovimientosSchema.parse(c.req.query())` por `c.req.valid("query")`
  - Mapear `FiltroInvalidoError` a 400 (depende de T002, T018)
- [X] T020 [P] [US2] Lo mismo en `src/modules/almacen/adapters/inventario.rest.ts` (ruta `GET /variantes/{varianteId}/movimientos`, hoy línea ~79), con `MovimientoVarianteSchema` (depende de T002, T018)
- [X] T021 [P] [US2] En `src/modules/almacen/infrastructure/insumo.prisma.repository.ts` (`listarMovimientos`, ~línea 151), convertir `params.filterValue` con `convertirValorFiltro(params.filterField, params.filterValue)` antes de llamar a `toPrismaArgs`, para que `cantidad gt 5` y los filtros por `createdAt` lleguen a Prisma con el tipo correcto en lugar de fallar con 500 (depende de T004)
- [X] T022 [P] [US2] Lo mismo en `src/modules/almacen/infrastructure/inventario-producto.prisma.repository.ts` (`listarMovimientos`, ~línea 718) (depende de T004)

**Checkpoint**: `quickstart.md` §1 y §6. Las dos rutas devuelven la misma forma que antes

---

## Phase 5: Polish & Cross-Cutting

- [X] T023 `npx tsc --noEmit` → 0 errores nuevos respecto de T001
- [X] T024 `pnpm test` → verde, incluidos `tests/integration/openapi.test.ts` (operationId únicos) y los tests nuevos
- [ ] T025 Ejecutar `quickstart.md` completo (§1–§6) contra la DB de desarrollo con dos tenants y anotar el resultado en este archivo, en especial §3 (aislamiento, SC-004) y §4 (recorrido de páginas, SC-006)
- [ ] T026 Cambiar `**Status**: Draft` a `**Status**: Implemented` en `specs/020-movimientos-inventario-tenant/spec.md`

---

## Dependencies & Execution Order

```
T001 → T002, T003 → T004
                     ├─→ US1: T005,T006 (tests) → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T016
                     │                                                              T015 (independiente dentro de US1)
                     └─→ US2: T017 (test) → T018 → T019, T020 ; T021, T022
                                    ↓
                             Phase 5: T023–T026
```

- **US1 y US2 son independientes** después de Phase 2. Solo comparten `almacen.schema.ts` (T012 / T018) y el archivo de test de contrato (T016 / T017), así que esas tareas no van en paralelo entre historias.
- **T015** (índices) no bloquea la funcionalidad, solo el rendimiento. Puede hacerse en cualquier momento de US1.

## Parallel Examples

```text
# Phase 2
T002 core/openapi-responses.ts   |  T003 tests/unit/.../movimiento-filtro.test.ts

# US1, tests primero
T005 movimiento-tenant.sql.test.ts  |  T006 listar-movimientos-tenant.usecase.test.ts

# US2, después de T018
T019 insumo.rest.ts  |  T020 inventario.rest.ts  |  T021 insumo repo  |  T022 inventario repo
```

## Implementation Strategy

**Opción recomendada: US2 primero.** Son 6 tareas que tocan archivos existentes, no
agregan SQL nuevo y desbloquean de inmediato la paginación de los dos listados que el
frontend ya consume.

1. Phase 1 + Phase 2 (T001–T004)
2. US2 (T017–T022) → checkpoint → entregable
3. US1 (T005–T016) → checkpoint con dos tenants → entregable (desbloquea la US1 del frontend, spec 030)
4. Polish (T023–T026)

**MVP según prioridad de la spec**: Phase 1 + 2 + US1. Es lo que destraba la pantalla
de Movimientos que hoy da 404.

## Notes

- Fuera de alcance, registrado en `research.md` §6 y §8, sin tareas acá: `crearPrismaScoped` no aplica scoping por tenant (Art. III.3), y el borrado físico de insumos/productos borra su histórico por `onDelete: Cascade`.
- No hay Testcontainers en el repo. El SQL se valida con T005 (forma y parámetros) y T025 (ejecución real).
- Línea base (T001, 2026-10-01): `tsc --noEmit` 0 errores; `vitest run` 51 archivos ✓ / 10 skipped, 361 tests ✓ / 42 skipped, 0 fallos.
- Agregados durante US2 (no estaban en el plan original):
  - `normalizarFiltro` en `domain/movimiento-filtro.ts`: valida la combinación campo + operador (`contains` sobre `cantidad`, o `gt` sobre `tipo`, también terminaban en 500). Lo usan los dos repos y lo usará el builder SQL de US1.
  - `infrastructure/movimiento-prisma-args.ts` (`argsListadoMovimientos`) + `tests/unit/modules/almacen/movimiento-prisma-args.test.ts`: envuelve `toPrismaArgs` para los dos listados por entidad. Filtro tipado, `tipo` fuera del enum → resultado vacío, y orden desempatado por `id`.
  - Cambio de comportamiento: un filtro incompleto (por ejemplo `filterField` sin `filterOp`) antes se ignoraba en silencio y ahora es 400 (edge case de la spec: "no resolver descartando filtros en silencio").
- Resultado final (2026-10-01): `tsc --noEmit` 0 errores; `vitest run` 56 archivos ✓ / 10 skipped, 418 tests ✓ / 42 skipped, 0 fallos (+57 tests nuevos respecto de T001).
- T015: migración `20261001000000_movimientos_indice_tenant_fecha` **creada y NO aplicada**. Se generó con `prisma migrate diff --from-config-datasource` (solo lectura) y contiene únicamente los dos `CREATE INDEX`. La base de desarrollo es Neon remota; se aplica con `pnpm db:deploy` cuando se apruebe.
- T025 (parcial): las 9 variantes del SQL del listado tenant se ejecutaron sin error contra el schema real de Neon (orden por defecto, por cantidad y por tipo; filtros por tipo, origen, cantidad, createdAt y motivo con `%`/`_`; search + filtro). **No se pudo validar con datos**: la base no tiene ningún movimiento en `MovimientoAlmacen` ni en `MovimientoInventario`. Faltan quickstart §2–§4 con datos reales.
- Bug encontrado por T005: al crear `movimiento-tenant.sql.ts` desde el shell se perdieron los backslashes de `escaparLike`, que quedó sin escapar `%`/`_`. Se corrigió y el test (e) lo cubre.
