---
description: "Task list for feature 010-catalogo-comercial — 7 missing capabilities in existing module"
---

# Tasks: Catálogo Comercial — Capacidades Faltantes

**Feature**: 010-catalogo-comercial  
**Input**: `specs/010-catalogo-comercial/plan.md` + `spec.md` + `data-model.md` + `contracts/rest-api.md` + `research.md`  
**Scope**: El módulo `catalogo` ya existe con 48 archivos. Esta lista cubre únicamente las **7 capacidades faltantes**.

**Organization**: Tareas agrupadas por historia de usuario para entrega incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario asociada (US1–US4)

---

## Phase 1: Setup — Modificaciones al Dominio

**Purpose**: Actualizar la capa de dominio con los errores y métodos nuevos. Todas las fases siguientes dependen de estos cambios.

- [X] T001 Agregar clases de error `ProductoConMovimientos`, `AltaMasivaVacia`, `ClaProductoNoEncontrado` (cada una con campo `readonly code`) en `src/modules/catalogo/domain/catalogo.errors.ts`
- [X] T002 Actualizar `IProductoRepository` en `src/modules/catalogo/domain/ports/IProductoRepository.ts`: agregar `tipoDescuento?: string` a `ProductoCreateDTO` y `ProductoUpdateDTO`; agregar firmas de 9 métodos nuevos: `verificarCodigo`, `eliminar`, `registrarMovimientoCreacion`, `eliminarMovimientoCreacion`, `actualizarMovimientoCreacion`, `tieneMovimientosReales`, `generarPropuestaVariantes`, `confirmarVariantes`, `altaMasiva`

---

## Phase 2: Foundational — Infraestructura Transversal

**Purpose**: Schemas Zod y mapeo de errores que necesitan US1–US4. Completa antes de iniciar user stories.

**⚠️ CRÍTICO**: No iniciar fases de user stories hasta completar esta fase.

- [X] T003 [P] Agregar schemas Zod para 5 endpoints nuevos en `src/modules/catalogo/adapters/catalogo.schema.ts`: `verificarCodigoQuerySchema` (query param `codigo` requerido), `eliminarProductoParamSchema`, `generarPropuestaParamSchema`, `confirmarVariantesBodySchema` (array `variantes` min 1, cada elemento con `atributoValorIds` array + `precio?` + `cantidadStock?` + `imagenUrl?`), `altaMasivaBodySchema` (`claProductoIds` array min 1)
- [X] T004 [P] Agregar mapeos en `handleCatalogoError` en `src/modules/catalogo/adapters/producto.rest.ts`: `ProductoConMovimientos` → 409 `PRODUCTO_CON_MOVIMIENTOS`; `AltaMasivaVacia` → 400 `ALTA_MASIVA_VACIA`; `ClaProductoNoEncontrado` → 404 `CLA_PRODUCTO_NO_ENCONTRADO` (body incluye `.ids`)

**Checkpoint**: Dominio + infraestructura transversal listos — US1-US4 pueden comenzar.

---

## Phase 3: User Story 1 — Gestión de Productos (Priority: P1) 🎯 MVP

**Goal**: Verificar código duplicado, eliminar productos con limpieza de inventario, proteger stock inicial, y propagar `tipoDescuento` en crear/actualizar.

**Independent Test**: Crear COMERCIALIZACION con tipoDescuento → verificar movimiento CREACION existe → intentar modificar stock con movimientos reales → esperar 409 → eliminar producto → verificar movimiento CREACION eliminado.

### Implementation for User Story 1

- [X] T005 [P] [US1] Implementar métodos US1 en `src/modules/catalogo/infrastructure/producto.prisma.repository.ts`: `verificarCodigo` (findFirst por codigo+tenantId), `eliminar` (delete con scoped tenant), `registrarMovimientoCreacion` (usa `prismaBase as any` para escribir en almacen.MovimientoInventario tipo=CREACION), `eliminarMovimientoCreacion` (usa `prismaBase as any` delete donde tipo=CREACION), `actualizarMovimientoCreacion` (usa `prismaBase as any` update cantidad+stockDespues donde tipo=CREACION), `tieneMovimientosReales` (count donde tipo != CREACION)
- [X] T006 [P] [US1] Crear `src/modules/catalogo/application/producto/verificar-codigo.usecase.ts`: recibe `{ tenantId, codigo }`; llama `repo.verificarCodigo`; devuelve `{ existe: boolean, producto?: { id, nombre, codigo } }`
- [X] T007 [P] [US1] Crear `src/modules/catalogo/application/producto/registrar-stock-inicial.usecase.ts`: recibe `{ productoId, tenantId, cantidadStock, userId, tipoProducto }`; si `tipoProducto === 'COMERCIALIZACION'` llama `repo.registrarMovimientoCreacion`; SERVICIO y otros tipos no generan movimiento
- [X] T008 [P] [US1] Crear `src/modules/catalogo/application/producto/eliminar-producto.usecase.ts`: (1) verificar producto existe en tenant; (2) verificar rol PROPIETARIO|ADMIN; (3) `repo.eliminarMovimientoCreacion`; (4) `repo.eliminar`; (5) `notificador.productoEliminado` (stub por ahora si notificador no tiene el método aún)
- [X] T009 [US1] Modificar `src/modules/catalogo/application/producto/crear-producto.usecase.ts`: pasar `tipoDescuento` del DTO al create de Prisma; después del create llamar `registrarStockInicialUseCase.execute({ productoId, tenantId, cantidadStock, userId, tipoProducto })`
- [X] T010 [US1] Modificar `src/modules/catalogo/application/producto/actualizar-producto.usecase.ts`: si el DTO incluye `cantidadStock`, llamar `repo.tieneMovimientosReales(productoId)`; si true lanzar `ProductoConMovimientos`; si false actualizar producto Y llamar `repo.actualizarMovimientoCreacion(productoId, tenantId, nuevoCantidadStock)` (solo si tipoProducto es COMERCIALIZACION)
- [X] T011 [US1] Agregar rutas en `src/modules/catalogo/adapters/producto.rest.ts`: `GET /productos/verificar-codigo` (roles: PROPIETARIO|ADMIN|ENCARGADO, query validado con `verificarCodigoQuerySchema`, llama `VerificarCodigoUseCase`); `DELETE /productos/:id` (roles: PROPIETARIO|ADMIN, llama `EliminarProductoUseCase`). **IMPORTANTE**: registrar ambas rutas ANTES de cualquier ruta con parámetro `/:id` genérico para evitar conflicto de paths.

### Tests for User Story 1

- [X] T012 [P] [US1] Crear `tests/catalogo/unit/application/verificar-codigo.usecase.test.ts`: test caso código existe (repo mock devuelve producto), test caso código no existe (repo mock devuelve null), test validación falta param
- [X] T013 [P] [US1] Crear `tests/catalogo/unit/application/eliminar-producto.usecase.test.ts`: test eliminación exitosa COMERCIALIZACION (verifica repo.eliminarMovimientoCreacion + repo.eliminar llamados en orden), test producto no encontrado → 404, test rol insuficiente → 403

**Checkpoint**: US1 completa — verificar código, eliminar producto, stock protegido, tipoDescuento en CRUD.

---

## Phase 4: User Story 2 — Variantes y Precios Especiales (Priority: P2)

**Goal**: Propuesta cartesiana de variantes (sin persistir) + confirmación batch de variantes seleccionadas.

**Independent Test**: Crear producto → definir 2 atributos (Talla: S/M/L, Color: Rojo/Azul) → GET propuesta (esperar 6 combinaciones) → POST confirmar solo 4 → GET variantes (esperar 4 registros).

### Implementation for User Story 2

- [X] T014 [US2] Implementar métodos US2 en `src/modules/catalogo/infrastructure/producto.prisma.repository.ts`: `generarPropuestaVariantes` (cargar atributos con valores del producto, calcular producto cartesiano en memoria con `atributos.reduce((acc, attr) => acc.flatMap(combo => attr.valores.map(v => [...combo, v])), [[]])`, devolver array de `{ etiqueta, combinacion[], valoresIds }`); `confirmarVariantes` (batch create de `ProductoVariante` con sus relaciones `ProductoVarianteAtributo`, lanzar `VarianteDuplicada` si alguna combinación ya existe)
- [X] T015 [US2] Crear `src/modules/catalogo/application/producto/generar-variantes-cartesiano.usecase.ts`: orquesta dos sub-operaciones según parámetro de acción — (a) `generar`: llama `repo.generarPropuestaVariantes` y devuelve propuesta sin persistir; (b) `confirmar`: llama `repo.confirmarVariantes` con el subset seleccionado y emite `notificador.variantesGeneradas` (stub si notificador no tiene el método aún)
- [X] T016 [US2] Agregar rutas en `src/modules/catalogo/adapters/producto.rest.ts`: `GET /productos/:id/variantes/propuesta` (roles: PROPIETARIO|ADMIN|ENCARGADO, devuelve `{ propuesta, total }`); `POST /productos/:id/variantes/confirmar` (roles: PROPIETARIO|ADMIN, body validado con `confirmarVariantesBodySchema`, devuelve `{ creadas, total }` con status 201)

### Tests for User Story 2

- [X] T017 [P] [US2] Crear `tests/catalogo/unit/application/generar-variantes-cartesiano.usecase.test.ts`: test cartesiano con 2 atributos (3×2=6 combinaciones), test cartesiano con 1 atributo (n combinaciones), test producto sin atributos → error `SIN_ATRIBUTOS`, test confirmar subset (persistir solo los seleccionados)

**Checkpoint**: US2 completa — propuesta cartesiana + confirmación de variantes batch.

---

## Phase 5: User Story 3 — Alta Masiva desde Catálogo Maestro (Priority: P3)

**Goal**: Crear múltiples productos en una transacción atómica desde plantillas ClaProducto; auto-crear categorías y unidades de medida faltantes.

**Independent Test**: Seleccionar 3 IDs de ClaProducto → POST alta-masiva → verificar 3 productos creados con stock=0 → repetir con un ID falso → verificar que NINGÚN producto fue creado.

### Implementation for User Story 3

- [X] T018 [US3] Implementar `altaMasiva` en `src/modules/catalogo/infrastructure/producto.prisma.repository.ts`: dentro de `prisma.$transaction()` — (1) cargar todos los `ClaProducto` del schema `compartido` (via `prismaBase as any`); (2) si algún ID no existe → throw `ClaProductoNoEncontrado(missingIds)` (transacción hace rollback); (3) por cada plantilla: resolver/crear `Categoria` del tenant vinculada al maestro, resolver/crear `UnidadMedida` del tenant vinculada al maestro; (4) batch create de `Producto` con `cantidadStock=0` y `tipoDescuento='SIN_DESCUENTO'`; (5) devolver `{ creados: ProductoEntity[], categoriasCreadas, unidadesMedidaCreadas }`
- [X] T019 [US3] Crear `src/modules/catalogo/application/producto/alta-masiva-productos.usecase.ts`: validar `claProductoIds.length >= 1` (lanzar `AltaMasivaVacia` si vacío); llamar `repo.altaMasiva`; emitir `notificador.altaMasivaCompletada` (stub si notificador no tiene el método aún); devolver resultado
- [X] T020 [US3] Agregar ruta `POST /productos/alta-masiva` en `src/modules/catalogo/adapters/producto.rest.ts` (roles: PROPIETARIO|ADMIN, body validado con `altaMasivaBodySchema`, status 201). **IMPORTANTE**: registrar esta ruta ANTES de `POST /productos/:id` o cualquier ruta con parámetro dinámico posterior para evitar que "alta-masiva" sea interpretado como un ID.

### Tests for User Story 3

- [X] T021 [P] [US3] Crear `tests/catalogo/unit/application/alta-masiva-productos.usecase.test.ts`: test lista vacía → AltaMasivaVacia, test IDs inexistentes → ClaProductoNoEncontrado con array de IDs, test éxito con 3 plantillas (verifica repo.altaMasiva llamado con los IDs correctos), test notificador.altaMasivaCompletada emitido

**Checkpoint**: US3 completa — alta masiva atómica con rollback y auto-creación de entidades.

---

## Phase 6: User Story 4 — Actualizaciones en Tiempo Real (Priority: P4)

**Goal**: Emitir 3 eventos Socket.IO faltantes: `catalogo:producto-eliminado`, `catalogo:variantes-generadas`, `catalogo:alta-masiva-completada`.

**Independent Test**: Conectar dos sesiones Socket.IO al room `tenant:{tenantId}` → ejecutar DELETE producto desde sesión A → verificar evento `catalogo:producto-eliminado` en sesión B en < 2s.

### Implementation for User Story 4

- [X] T022 [US4] Agregar 3 nuevos métodos a `ICatalogoNotificador` en `src/modules/catalogo/domain/ports/ICatalogoNotificador.ts`: `productoEliminado(tenantId, data: { productoId, nombre }): Promise<void>`; `variantesGeneradas(tenantId, data: { productoId, cantidadVariantes }): Promise<void>`; `altaMasivaCompletada(tenantId, data: { productosCreados, categoriasCreadas, unidadesMedidaCreadas }): Promise<void>`
- [X] T023 [US4] Implementar los 3 nuevos métodos en `src/modules/catalogo/infrastructure/catalogo.socket.notificador.ts` (o el archivo que implementa `ICatalogoNotificador`): emitir al room `tenant:${tenantId}` los eventos `catalogo:producto-eliminado`, `catalogo:variantes-generadas`, `catalogo:alta-masiva-completada` con el payload tipado según `contracts/rest-api.md` sección 7
- [X] T024 [US4] Reemplazar stubs de notificador en `eliminar-producto.usecase.ts`, `generar-variantes-cartesiano.usecase.ts` y `alta-masiva-productos.usecase.ts` con llamadas reales a los métodos implementados en T022–T023; verificar que los tipos coinciden con `ICatalogoNotificador`

**Checkpoint**: US4 completa — los 3 nuevos eventos se emiten en tiempo real al room del tenant.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tests de integración, verificación de tipos y validación manual.

- [ ] T025 [P] Extender `tests/catalogo/integration/producto.prisma.repository.test.ts` con tests para los 9 nuevos métodos del repositorio: `verificarCodigo` (código existe / no existe), `eliminar` (verifica cascade + cleanup CREACION), `registrarMovimientoCreacion` (verifica registro en almacen schema), `eliminarMovimientoCreacion` (verifica borrado), `actualizarMovimientoCreacion` (verifica cantidad y stockDespues), `tieneMovimientosReales` (false con solo CREACION, true con ENTRADA), `generarPropuestaVariantes` (cartesiano correcto), `confirmarVariantes` (crea variantes persistidas), `altaMasiva` (transacción, rollback si falta ID)
- [X] T026 Ejecutar `tsc --noEmit` desde raíz del proyecto y resolver todos los errores de tipos introducidos por los nuevos métodos, implementaciones de interface y cambios en DTOs
- [ ] T027 Validar los 8 escenarios de `specs/010-catalogo-comercial/quickstart.md` con un cliente REST: ejecutar cada escenario en orden y verificar los criterios de PASS descritos

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — iniciar inmediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 (usa las clases de error de T001). T003 y T004 pueden correr en paralelo entre sí.
- **US1 (Phase 3)**: Depende de Phases 1+2. T005, T006, T007, T008 pueden iniciarse en paralelo (archivos distintos). T009 depende de T007; T010 depende de T009. T011 depende de T005+T006+T007+T008.
- **US2 (Phase 4)**: Depende de Phases 1+2. T014 y T015 secuenciales. T016 depende de T015.
- **US3 (Phase 5)**: Depende de Phases 1+2. T018 → T019 → T020, secuenciales.
- **US4 (Phase 6)**: Depende de US1+US2+US3 (los use cases deben existir para conectar el notificador). T022 → T023 → T024, secuenciales.
- **Polish (Phase 7)**: Depende de todas las fases anteriores.

### User Story Dependencies

- **US1 (P1)**: Independiente — puede iniciar tras Phases 1+2
- **US2 (P2)**: Independiente — puede iniciar tras Phases 1+2 (no depende de US1)
- **US3 (P3)**: Independiente — puede iniciar tras Phases 1+2 (no depende de US1/US2)
- **US4 (P4)**: Depende de US1+US2+US3 (necesita los use cases completos para cablear el notificador)

### Parallel Opportunities

- T001 y T002 pueden correr en paralelo (archivos distintos)
- T003 y T004 pueden correr en paralelo (archivos distintos)
- T005, T006, T007, T008 pueden correr en paralelo entre sí (archivos distintos)
- T012 y T013 pueden correr en paralelo entre sí
- T017, T021 pueden correr en paralelo (test files distintos)
- T025 y T026 pueden correr en paralelo

---

## Parallel Example: User Story 1

```text
# Tras completar Phases 1+2, lanzar en paralelo:
Task T005: Implementar métodos repositorio US1 en producto.prisma.repository.ts
Task T006: Crear verificar-codigo.usecase.ts
Task T007: Crear registrar-stock-inicial.usecase.ts
Task T008: Crear eliminar-producto.usecase.ts

# Tras completar T005+T007:
Task T009: Modificar crear-producto.usecase.ts
Task T010: Modificar actualizar-producto.usecase.ts  (pueden correr en paralelo)

# Tras completar T005+T006+T008+T009+T010:
Task T011: Agregar rutas GET /verificar-codigo y DELETE /:id
```

---

## Implementation Strategy

### MVP (US1 Only)

1. Completar Phase 1: Setup (T001–T002)
2. Completar Phase 2: Foundational (T003–T004)
3. Completar Phase 3: US1 (T005–T013)
4. **VALIDAR**: Ejecutar escenarios 1–5 de `quickstart.md`
5. Desplegar si listo — las restantes US amplían funcionalidad sin romper US1

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → CRUD completo con inventario + validar → Deploy MVP
3. US2 → variantes → validar → Deploy
4. US3 → alta masiva → validar → Deploy
5. US4 → tiempo real → validar → Deploy

---

## Notes

- Los 9 métodos nuevos de repositorio usan `prismaBase as any` para acceso cross-schema a `almacen.MovimientoInventario` y `compartido.ClaProducto`
- El unique constraint de `MovimientoInventario` es `[tenantId, productoId, varianteId, tipo, referenciaId]` — garantiza 1 solo CREACION por producto
- El orden de rutas en `producto.rest.ts` es crítico: rutas estáticas (`/verificar-codigo`, `/alta-masiva`) ANTES de rutas con parámetros (`/:id`)
- `tieneMovimientosReales` devuelve `true` si existen movimientos con `tipo != 'CREACION'`
- `altaMasiva` usa `prisma.$transaction()` — cualquier error hace rollback completo de todos los productos
- El mapeo `ClaProducto.claActividadId → ActividadEconomica del tenant` usa el campo existente; si la actividad no existe en el tenant se lanza un error de validación (no se auto-crea, a diferencia de categoría y unidad)
