# Research: Inventario de Productos y Almacén de Insumos

**Branch**: `011-inventario-almacen` | **Date**: 2026-05-26

## Hallazgo crítico: módulo `almacen` ya existe

El módulo `src/modules/almacen/` ya tiene **49 archivos** implementados. Esta planificación es una extensión/refactorización, no una construcción desde cero.

---

## Decision 1: Estado del módulo existente vs. lo que requiere el spec 011

**Decisión:** Refactorizar los use cases de ajustes, recuentos, ingresos y salidas para implementar el patrón borrador-aprobación. Los demás componentes (insumos, receta, notificador, infraestructura base) se conservan sin cambios.

**Rationale:**
- El esquema Prisma (40-almacen.prisma) **ya tiene** los campos `estado Estado` en `AjusteInventario`, `RecuentoInventario`, `IngresoAlmacen` y `SalidaAlmacen`, todos con default `PENDIENTE`.
- El enum `Estado` ya tiene los valores `PENDIENTE` (= borrador) y `APROBADO`.
- Los modelos `MovimientoInventario` y `MovimientoAlmacen` ya tienen la restricción `@@unique` necesaria para la idempotencia.
- Los use cases actuales **bypassean** el estado: `registrarAjuste` crea `AjusteInventario` con `estado: "ACTIVO"` y aplica el stock inmediatamente. El spec 011 requiere separar creación (PENDIENTE) de aprobación (APROBADO).

**Alternativa descartada:** Crear un módulo paralelo `inventario` separado de `almacen`. Rechazado porque duplicaría lógica, rompería la constitución (Artículo II — un solo módulo por dominio) y el schema ya está en `almacen`.

---

## Decision 2: Stock de productos — ¿nuevo modelo o campos en Producto/Variante?

**Decisión:** Usar los campos `cantidadStock` y `stockMinimo` que ya existen en `Producto` y `ProductoVariante` (schema `catalogo`). No crear nuevos modelos `StockProducto` ni `StockVariante`.

**Rationale:**
- `Producto.cantidadStock` y `Producto.stockMinimo` existen en `30-catalogo.prisma`.
- `ProductoVariante.cantidadStock`, `ProductoVariante.stockMinimo` e `ProductoVariante.inventarioActivado` existen en el mismo schema.
- El repositorio `inventario-producto.prisma.repository.ts` ya usa cross-schema accediendo a `productoVariante` vía `prismaBase as any`.
- La regla FR-007 (recalcular stock del padre como suma de variantes) es una actualización a `Producto.cantidadStock` ya existente.

**Alternativa descartada:** Crear modelos explícitos `StockProducto` y `StockVariante` en el schema `almacen`. Rechazado porque implicaría duplicar los campos de stock que ya existen en `catalogo` y agregaría complejidad de sincronización innecesaria.

---

## Decision 3: Inicialización automática de stock (FR-020, FR-021)

**Decisión:** La auto-inicialización se implementa como use case `auto-inicializar-stock` que:
1. Al activar el módulo: itera todos los productos/variantes del tenant y crea MovimientoInventario CREACION + pone `inventarioActivado = true`.
2. Al crear un producto/variante nuevo: el módulo `catalogo` llama al puerto `IAlmacenInventarioPort.inicializarProducto(productoId, varianteId?)` vía inyección de dependencia.

**Rationale:**
- La inicialización masiva (punto 1) se ejecuta una sola vez por tenant, idealmente como job BullMQ.
- La inicialización al crear producto/variante (punto 2) sigue el patrón de integración del Artículo II — las dependencias entre módulos son unidireccionales; `catalogo` puede conocer un puerto de `almacen` sin que `almacen` conozca a `catalogo`.

**Alternativa descartada:** Triggers de base de datos. Rechazado porque viola la arquitectura hexagonal (Artículo II) y dificulta los tests.

---

## Decision 4: Bloqueo optimista (FR-023)

**Decisión:** Agregar campo `version Int @default(0)` a `AjusteInventario`, `RecuentoInventario`, `IngresoAlmacen` y `SalidaAlmacen`. La aprobación verifica que la versión en la request coincide con la versión en BD; si no, lanza `ConflictoVersionError`.

**Rationale:**
- Patrón estándar de ETag/versión para bloqueo optimista.
- Prisma no tiene bloqueo optimista nativo en v7; el campo `version` + check explícito es la solución canónica.
- Bajo contención (pocos ajustes concurrentes sobre el mismo item), el overhead es mínimo.

**Implementación:**
```ts
// En aprobar-ajuste.usecase.ts
const ajuste = await repo.obtenerAjuste(ajusteId, tenantId)
if (ajuste.version !== input.version) throw new ConflictoVersionError()
// Proceder con la transacción
```

**Alternativa descartada:** `SELECT FOR UPDATE` (bloqueo pesimista). Rechazado porque Prisma no lo expone de forma limpia en v7 sin raw SQL, y en cargas bajas de inventario el bloqueo optimista es suficiente.

---

## Decision 5: Idempotencia de MovimientoInventario y MovimientoAlmacen (FR-003, FR-024)

**Decisión:** Usar `upsert` de Prisma con la clave compuesta existente `@@unique([tenantId, productoId, varianteId, tipo, referenciaId])` y `@@unique([tenantId, insumoId, tipo, referenciaId])`.

**Rationale:**
- Los índices únicos ya existen en el schema; no requieren migración adicional.
- `prisma.movimientoInventario.upsert({ where: { tenantId_productoId_varianteId_tipo_referenciaId: {...} }, create: {...}, update: {...} })` es la implementación directa.
- Cubre el escenario de Feature 006 reprocessando una venta (misma `referenciaId = ventaId`).

---

## Decision 6: Integración con Feature 006 — ventas crean movimientos SALIDA (FR-019)

**Decisión:** El módulo `ventas` llama al puerto `IAlmacenInventarioPort.registrarSalidaVenta(ventaId, tenantId, detalles)` desde el use case `crear-venta`. El módulo `almacen` expone la implementación concreta.

**Rationale:**
- Sigue la regla del Artículo II: "Las dependencias entre módulos son explícitas y unidireccionales. Las verticales pueden depender del núcleo, pero el núcleo NUNCA depende de una vertical concreta." — `almacen` es núcleo; `ventas` depende del puerto de almacen.
- Alternativa (BullMQ async): rechazada porque el spec dice que la venta descuenta el inventario de forma inmediata (referenciaId = ventaId para idempotencia), y acoplar via queue añadiría eventual consistency que no está en el spec.

**Archivos afectados en Feature 006:**
- `src/modules/ventas/domain/ports/IAlmacenInventarioPort.ts` — [NEW] interfaz
- `src/modules/ventas/application/crear-venta.usecase.ts` — [MODIFY] llamar al puerto tras crear la venta
- `src/modules/almacen/infrastructure/almacen-inventario.port.adapter.ts` — [NEW] implementación del puerto

---

## Decision 7: Patrón draft-approve — qué use cases se reemplazan vs. qué se conserva

| Use case existente | Acción | Justificación |
|---|---|---|
| `registrar-ajuste.usecase.ts` | REEMPLAZAR por crear+aprobar | Lógica completamente diferente (borrador → aprobación) |
| `registrar-recuento.usecase.ts` | REEMPLAZAR por crear+aprobar | Ídem |
| `inicializar-variante.usecase.ts` | ELIMINAR | Reemplazado por auto-inicialización (FR-020/FR-021) |
| `crear-ingreso.usecase.ts` | REFACTORIZAR | Separar creación de aplicación de stock |
| `crear-salida.usecase.ts` | REFACTORIZAR | Ídem |
| `listar-ajustes.usecase.ts` | CONSERVAR | Sin cambios |
| `listar-recuentos.usecase.ts` | CONSERVAR | Sin cambios |
| `listar-ingresos.usecase.ts` | CONSERVAR | Sin cambios |
| `listar-salidas.usecase.ts` | CONSERVAR | Sin cambios |
| `registrar-recuento-almacen.usecase.ts` | CONSERVAR | Sin cambios |
| `obtener-stock.usecase.ts` | CONSERVAR | Sin cambios |
| `listar-movimientos-variante.usecase.ts` | CONSERVAR | Sin cambios |
| Todos los use cases de insumo | CONSERVAR | Sin cambios |
| Todos los use cases de receta | CONSERVAR | Sin cambios |

---

## Decision 8: Verificación de stock negativo — pre-check antes de transacción

**Decisión:** En `aprobar-ajuste` y `aprobar-recuento`, cargar el stock actual de todos los ítems afectados ANTES de iniciar la transacción Prisma, verificar que ninguno quedaría negativo, y solo entonces iniciar la transacción. Si falla, lanzar `StockNegativoError` con el productoId y varianteId afectados.

**Rationale:**
- El pre-check evita iniciar una transacción que se revertiría, mejorando el tiempo de respuesta para el caso de error.
- La verificación "no-negativo" en el pre-check puede tener condiciones de race bajo concurrencia extrema, pero el bloqueo optimista (Decision 4) detecta y rechaza la segunda aprobación si el stock fue modificado entretanto.

**Implementación:**
```ts
const stockActual = await repo.obtenerStockVariante(varianteId, tenantId)
const stockResultante = stockActual + cantidadAjuste
if (stockResultante < 0) throw new StockNegativoError(productoId, varianteId)
// Proceder con tx
```

---

## Archivos Prisma que requieren migración

Solo se agregan campos nuevos; no se eliminan ni renombran campos existentes.

| Modelo | Campo nuevo | Tipo |
|---|---|---|
| `AjusteInventario` | `version` | `Int @default(0)` |
| `RecuentoInventario` | `version` | `Int @default(0)` |
| `IngresoAlmacen` | `version` | `Int @default(0)` |
| `SalidaAlmacen` | `version` | `Int @default(0)` |
| `SalidaAlmacen` | `motivo` | `String?` |

**No se requieren nuevos modelos** en el schema.
