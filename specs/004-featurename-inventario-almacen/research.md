# Research: Inventario y Almacén

**Feature**: 004-inventario-almacen
**Date**: 2026-05-22

---

## Decision 1: Módulo y schema de base de datos

**Decision**: El feature ocupa el módulo `src/modules/almacen/` y el schema PostgreSQL `almacen` (ya existente en `prisma/40-almacen.prisma`).

**Rationale**: La constitución (Art. II.1) lista `almacen` como uno de los módulos del núcleo compartido. El archivo `40-almacen.prisma` ya define 12 modelos para este dominio. El código de aplicación va en `src/modules/almacen/` siguiendo la estructura hexagonal del Art. II.2.

**Alternatives considered**: Crear un módulo `inventario` separado — rechazado porque la constitución nombra explícitamente `almacen` como el módulo de núcleo y el schema ya existe con ese nombre.

---

## Decision 2: Stock en ProductoVariante (sin tabla separada)

**Decision**: El stock de variantes se gestiona directamente en los campos `cantidadStock` y `stockMinimo` de `ProductoVariante`. No se crea una tabla `StockVariante` separada.

**Rationale**: El schema `30-catalogo.prisma` ya tiene `cantidadStock Int @default(0)` y `stockMinimo Int @default(0)` en `ProductoVariante`. Los movimientos del módulo `almacen` actualizan estos campos vía `$transaction`. Crear una tabla separada duplicaría la fuente de verdad.

**Alternatives considered**: Tabla `StockVariante` independiente — rechazada por duplicación de datos y porque `ProductoVariante` ya tiene los campos adecuados con los mismos tipos.

---

## Decision 3: Inicialización explícita de variante en inventario

**Decision**: Agregar `inventarioActivado Boolean @default(false)` a `ProductoVariante`. La acción de "inicializar" establece `cantidadStock`, `stockMinimo` e `inventarioActivado = true`. Los movimientos se rechazan si `inventarioActivado = false`.

**Rationale**: El spec (clarificación C) requiere que el operador inicialice explícitamente cada variante antes de registrar movimientos. El flag `inventarioActivado` es el mecanismo más limpio para distinguir "nunca inicializado" (default 0 en ambos campos) de "inicializado con stock = 0" (stock explícito en 0).

**Alternatives considered**: Usar `stockMinimo > 0` como proxy de inicialización — rechazado porque stockMinimo = 0 es un valor de negocio válido. Lazy init en primer movimiento — rechazado por la clarificación del usuario.

---

## Decision 4: Recetas por variante (extensión de ProductoInsumo)

**Decision**: Extender `ProductoInsumo` con `varianteId String?` (opcional). Cuando `varianteId = null`, la receta aplica al producto base; cuando está presente, aplica solo a esa variante. Cambiar unique constraint a `@@unique([productoId, varianteId, insumoId])`.

**Rationale**: La clarificación (Opción B) establece herencia de receta: variante usa su receta si existe, sino hereda la del producto base. Extender `ProductoInsumo` reutiliza el modelo existente sin crear una tabla adicional.

**Alternatives considered**: Crear modelo `VarianteInsumo` separado — rechazado por duplicación de estructura idéntica a `ProductoInsumo`. Receta solo a nivel de producto — rechazado porque la clarificación eligió Opción B explícitamente.

---

## Decision 5: Campos de historial en movimientos

**Decision**: Agregar `stockAntes Int @default(0)` y `stockDespues Int @default(0)` a `MovimientoInventario` y `MovimientoAlmacen`.

**Rationale**: El spec exige que cada movimiento registre "stock antes" y "stock después" (FR-002, FR-009). Los modelos existentes no tienen estos campos. Es información crítica para auditoría que no puede reconstruirse confiablemente.

**Alternatives considered**: Recalcular historial sumando movimientos — rechazado porque es costoso y frágil ante posibles gaps en los datos.

---

## Decision 6: Sin guard de capability

**Decision**: El módulo `almacen` no requiere guard de vertical (`esTienda`, `esConsultorio`, etc.). Solo `requireAuth + requireTenantActivo`.

**Rationale**: La constitución lista `almacen` como módulo del "núcleo compartido (siempre presentes)", igual que `catálogo`. Los comentarios en `10-tenant.prisma` confirman: "el inventario, ventas, caja y proveedores viven directamente bajo Tenant, así que CUALQUIER vertical puede usar los modelos compartidos".

**Alternatives considered**: Guard `esTienda` — rechazado porque el almacén de insumos aplica a restaurantes y consultorios con farmacia igualmente.

---

## Decision 7: Proveedor en IngresoAlmacen

**Decision**: `IngresoAlmacen.proveedorId` referencia el modelo `Proveedor` del schema `ventas` (ya definido en `50-ventas.prisma`). El módulo `almacen` consulta proveedores del tenant para los ingresos.

**Rationale**: El schema `40-almacen.prisma` ya tiene `proveedorId String` en `IngresoAlmacen` referenciando `Proveedor`. El modelo `Proveedor` existe en `ventas`. Reutilizar este modelo evita duplicar la entidad proveedor.

**Alternatives considered**: Campo `proveedor String` libre en IngresoAlmacen — rechazado porque el schema ya tiene la FK a `Proveedor` definida.

---

## Decision 8: Notificador Socket.IO

**Decision**: Crear `IAlmacenNotificador` port con 4 eventos: `almacen:stock:critico`, `almacen:stock:normalizado`, `almacen:insumo:stock:critico`, `almacen:insumo:stock:normalizado`. Seguir el patrón `ICatalogoNotificador` exactamente (provider, null impl, socket impl).

**Rationale**: La constitución Art. VI.2 requiere que eventos se emitan desde la capa de aplicación vía puerto Notificador. El patrón del módulo catálogo ya está establecido y funciona. Cuatro eventos cubren las dos señales del spec (crítico y normalizado) para los dos dominios (producto e insumo).

**Alternatives considered**: Reutilizar `ICatalogoNotificador` — rechazado porque los eventos de almacén son semánticamente distintos y el puerto catálogo no debería conocer el dominio almacén.

---

## Decision 9: AjusteInventario como operación batch

**Decision**: Los ajustes de inventario siguen el patrón header-detail (`AjusteInventario` + `AjusteDetalle`) ya definido en el schema. Un ajuste puede incluir múltiples variantes en una sola operación transaccional.

**Rationale**: El schema ya tiene el modelo `AjusteInventario` con `detalles AjusteDetalle[]`. Este patrón es estándar en sistemas de inventario y permite trazabilidad por operación completa.

**Alternatives considered**: Un movimiento por variante sin header — rechazado porque el schema ya define el header-detail y permite agrupar ajustes relacionados.

---

## Decision 10: RecuentoInventario como operación batch

**Decision**: Los recuentos de productos siguen el patrón `RecuentoInventario` + `RecuentoDetalle` (ya en el schema). Al confirmar el recuento, el sistema aplica un `AjusteInventario` automático para las diferencias ≠ 0.

**Rationale**: El schema ya tiene `RecuentoInventario` con `RecuentoDetalle[]`. Este patrón agrupa el recuento de múltiples variantes en una sesión de conteo auditada. La diferencia se aplica como ajuste automático para mantener el trail completo.

**Alternatives considered**: Recuento por variante individual — rechazado porque el schema ya define el batch y es más útil en la práctica.
