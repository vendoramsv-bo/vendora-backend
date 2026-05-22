# Research: Catálogo Comercial

**Feature**: 003-catalogo-comercial
**Date**: 2026-05-22
**Status**: Complete — todos los NEEDS CLARIFICATION resueltos

---

## 1. Scope del módulo `catalogo`

**Decision**: El módulo `catalogo` gestiona exclusivamente los datos del catálogo comercial: actividades económicas del tenant, unidades de medida, categorías, productos, variantes, atributos, precios por volumen, opciones adicionales, ofertas y el historial de precios. No incluye movimientos de inventario, compras ni ventas.

**Rationale**: Separación de responsabilidades per Artículo II.1. El catálogo define QUÉ existe; `almacen` rastrea cuánto hay; `ventas` registra qué se vendió. El campo `cantidadStock` en `Producto` y `ProductoVariante` se actualiza manualmente vía este módulo (stock informacional, per spec Assumptions).

**Alternatives considered**: Incluir gestión de stock en el catálogo — rechazado porque acoplaría lógica de inventario al módulo de catálogo.

---

## 2. ActividadEconomica y UnidadMedida como entidades prerequisito

**Decision**: `ActividadEconomica` es una entidad de primer nivel en el módulo catálogo. El tenant "activa" clasificadores globales (`ClaActividadEconomica` del schema `compartido`) creando registros en `ActividadEconomica`. `UnidadMedida` es similar: el tenant crea sus propias unidades, opcionalmente vinculadas a `ClaUnidadMedida`. Ambas deben existir antes de crear Categoria/Producto respectivamente.

**Rationale**: El schema Prisma así lo impone: `Categoria.actividadId → ActividadEconomica` y `Producto.unidadId → UnidadMedida`. Exponer CRUD para ambas es necesario para que el tenant configure su catálogo.

**API implicada**:
- `GET /api/catalogo/cla-actividades` — clasificadores globales disponibles (solo lectura)
- `GET/POST/DELETE /api/catalogo/actividades` — actividades del tenant
- `GET/POST/PUT /api/catalogo/unidades` — unidades del tenant

---

## 3. Árbol de categorías — representación

**Decision**: Los endpoints devuelven categorías como lista plana con campo `padreId`. El campo `nivel` (entero) facilita ordenamiento. No se retorna árbol anidado desde el backend. Para consultas de árbol, el frontend construye la jerarquía a partir de la lista plana.

**Rationale**: Más simple, flexible y performante. La lista plana no requiere recursividad en Prisma. El campo `nivel` ya está en el schema y permite ordenar correctamente. La profundidad es arbitraria y un árbol anidado requeriría una consulta recursiva (CTE) que complejiza el ORM.

**Alternatives considered**: Retornar árbol anidado — factible con `include: { hijos: { include: { hijos: ... } } }` hasta N niveles, pero frágil para profundidades variables y no necesario para el primer release.

---

## 4. Historial de precios — automatización

**Decision**: El `ActualizarProductoUseCase` detecta cambios en `Producto.precio` y crea un `ProductoPrecioHistorico` dentro de la misma transacción Prisma (`$transaction`). La creación del historial es responsabilidad del caso de uso, no del repositorio.

**Rationale**: El caso de uso es la capa correcta para orquestar la lógica de negocio (Artículo II). Hacerlo en transacción garantiza atomicidad: no puede actualizarse el precio sin registrar el histórico. `ProductoPrecioHistorico` no lleva `createdById`/`updatedById` — es un log inmutable (Artículo V.3).

**Alternatives considered**: Trigger en PostgreSQL — rechazado porque no usamos lógica en la DB. Dentro del repositorio — rechazado porque los repositorios no contienen lógica de negocio.

---

## 5. Vigencia de ofertas — filtrado

**Decision**: Las ofertas "vigentes" se filtran a nivel de query: `fechaInicio <= now() AND fechaFin >= now() AND estado = ACTIVO`. No hay job en background que marque ofertas expiradas. El endpoint `GET /productos/:id/ofertas` acepta un query param `soloVigentes=true` (default true).

**Rationale**: Filtrado en tiempo de consulta es simple, correcto y sin overhead operacional. La condición de vigencia es puramente temporal y no requiere estado persistido en el modelo. Alineado con el comportamiento descrito en la spec (FR-012).

**Alternatives considered**: Job BullMQ para marcar expiradas → overhead innecesario cuando el filtro dinámico es suficiente.

---

## 6. Unicidad de variantes — combinación de atributos

**Decision**: La unicidad por SKU se delega al constraint de DB (`@@unique([productoId, sku])`). La unicidad por combinación de valores de atributos se verifica a nivel de aplicación antes de crear la variante: se consulta si ya existe una variante con exactamente los mismos `atributoValorId` que los de la nueva variante.

**Rationale**: El constraint de DB cubre el caso más común (SKU duplicado). La verificación de combinación en app level es necesaria porque la unicidad de combinación de atributos no puede expresarse directamente en Prisma/SQL sin lógica adicional.

**Alternatives considered**: Hash computado de la combinación de atributos almacenado en la variante — over-engineering para este primer release.

---

## 7. Diseño de eventos en tiempo real

**Decision**: El módulo crea su propio puerto `ICatalogoNotificador` con implementación nula (`NullCatalogoNotificador`) y Socket.IO (`CatalogoSocketNotificador`). Usa el mismo patrón de provider (`getCatalogoNotificador` / `setCatalogoNotificador`) que el módulo consultorio para evitar dependencias circulares. Los eventos se emiten desde los use cases vía el puerto.

**Eventos definidos**:
- `catalogo:actividad:creada` — payload: `{ tenantId, actividadId, nombre }`
- `catalogo:categoria:creada` — payload: `{ tenantId, categoriaId, nombre, padreId }`
- `catalogo:categoria:actualizada` — payload: `{ tenantId, categoriaId, nombre, estado }`
- `catalogo:producto:creado` — payload: `{ tenantId, productoId, nombre, categoriaId, precio }`
- `catalogo:producto:actualizado` — payload: `{ tenantId, productoId, precio }`
- `catalogo:producto:estadoCambiado` — payload: `{ tenantId, productoId, estado }`
- `catalogo:oferta:creada` — payload: `{ tenantId, ofertaId, productoId, precioOferta }`
- `catalogo:oferta:actualizada` — payload: `{ tenantId, ofertaId, productoId, estado }`

**Rationale**: Mismo patrón que consultorio. Artículo VI.2: eventos desde application/, no desde adapters. Provider pattern evita importar `io` en los use cases.

---

## 8. Autorización — sin guard de vertical

**Decision**: El catálogo NO requiere ningún middleware de capability check (no hay flag `esCatalogo`). El único prerequisito es `requireAuth + requireTenantActivo`. Algunos endpoints de escritura (crear/actualizar categoría, producto) requieren rol `PROPIETARIO` o `ADMIN`.

**Rationale**: La spec dice "cualquier tenant puede gestionar productos". La constitución (Artículo III.4) requiere guards por vertical, pero solo para verticales opcionales. El catálogo es parte del núcleo compartido.

---

## 9. Prefix de rutas

**Decision**: Todas las rutas del módulo catálogo se montan bajo `/api/catalogo/` en `src/server/hono.ts`.

**Rationale**: Consistente con el patrón existente (`/api/tenant/`, `/api/consultorio/`).

---

## 10. Clasificadores globales (Cla*)

**Decision**: Los modelos `ClaActividadEconomica`, `ClaUnidadMedida`, `ClaCategoria` (en schema `compartido`) son datos maestros de plataforma. El módulo catálogo los expone en modo solo-lectura (para que el tenant elija qué actividades activar). No expone CRUD sobre ellos (son administrados por el sistema, no por tenants).

**Rationale**: Los `Cla*` son referencia global del sistema, no datos del tenant. Solo la plataforma puede crearlos/editarlos.
