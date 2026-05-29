# Research: TuTienda — Perfil Público de Comercio de Barrio

## Decisión 1: Patrón de datos para entidades sociales de la tienda

**Decision**: Tablas tipadas específicas por entidad (`TiendaComentario`, `TiendaValoracion`, etc.), NO polimorfismo con `referenciaTipo`.

**Rationale**: El schema actual (`80-social.prisma`) ya implementa el patrón de tablas tipadas: `TiendaReaccion`, `TiendaComentario`, `TiendaComentarioReaccion`, `TiendaValoracion`, `TiendaPregunta`, `TiendaRespuesta`, `TiendaFavorito`, `TiendaSeguidor`. Todos los modelos ya existen. Migrar a polimorfismo requeriría reescribir 12+ modelos y romper la consistencia con `ProductoComentario`, `ProductoValoracion`, etc. que siguen el mismo patrón. **La clarificación Q3 fue conceptual; la implementación sigue el patrón existente.**

**Alternatives considered**:
- Polimorfismo con `referenciaTipo = "COMERCIO"`: descartado — requiere migración destructiva y rompe el patrón establecido en el codebase.

---

## Decisión 2: Dónde vive el módulo de perfil y directorio

**Decision**: Crear un nuevo módulo `tienda` independiente (`src/modules/tienda/`) para perfil público, directorio y productos destacados. Las interacciones sociales (comentar, valorar, etc.) permanecen en `src/modules/social/`.

**Rationale**: La separación respeta la constitución (Artículo II.2 — hexagonal modular). El módulo `social` ya tiene su dominio y adaptadores. El perfil, directorio y configuración son responsabilidad de la vertical TuTienda. Seguir el procedimiento de nueva vertical del Artículo II.1.

**Alternatives considered**:
- Extender el módulo `tenant`: descartado — mezclaría la lógica pública del directorio con la gestión interna del tenant.
- Extender el módulo `social`: descartado — social no debería saber de directorio ni de Configuracion.

---

## Decisión 3: Schema de PostgreSQL para el módulo tienda

**Decision**: Reutilizar el schema `tenant` de PostgreSQL para los nuevos modelos (`ProductoDestacado`). El modelo `Tienda` y `Configuracion` ya viven en `@@schema("tenant")`. No se crea un schema `tienda` nuevo.

**Rationale**: `Tienda` es una extensión 1:1 del `Tenant` y ya está en el schema `tenant`. `ProductoDestacado` es una relación entre `Tienda` y `Producto`, ambos en schemas existentes. Agregar un nuevo schema PostgreSQL para una sola tabla adicional no justifica la complejidad.

**Alternatives considered**:
- Schema `tienda` separado: descartado — overhead sin beneficio dado que los modelos son extensiones del schema tenant.

---

## Decisión 4: Estado de TiendaPregunta

**Decision**: Cambiar el default de `TiendaPregunta.estado` de `PENDIENTE` a `ACTIVO`. El estado `INACTIVO` representa "pregunta ocultada por el propietario". No se agrega un campo `visibilidad` separado.

**Rationale**: La spec clarifica que las preguntas son visibles inmediatamente (ACTIVO por defecto) y el propietario puede ocultarlas (INACTIVO). Reutilizar el enum `Estado` existente es consistente con el patrón del codebase. Los filtros de lectura pública ya filtran por `estado = ACTIVO`.

**Alternatives considered**:
- Campo `visibilidad` separado con enum VISIBLE/OCULTA: descartado — añade complejidad sin beneficio dado que `Estado` ya provee esta semántica.

---

## Decisión 5: Búsqueda geoespacial para el directorio

**Decision**: Búsqueda por proximidad usando cálculo de distancia Haversine en SQL (`ST_Distance` vía raw query de Prisma, o fórmula en application layer). Ordenar por distancia calculada desde `(latitud, longitud)` del parámetro de búsqueda vs. `Localizacion` del tenant.

**Rationale**: Los modelos `Localizacion` (con `latitud Float`, `longitud Float`, e índice `@@index([latitud, longitud])`) ya existen. No se requiere PostGIS ni extensión adicional para la búsqueda básica de comercios cercanos con los volúmenes esperados (≤ 500 comercios en SC-003). La fórmula Haversine en una query SQL directa es suficiente.

**Alternatives considered**:
- PostGIS: descartado — requiere extensión PostgreSQL no garantizada en Render; overhead para volúmenes pequeños.
- Búsqueda solo por ciudad/barrio: considerada como fallback si la geolocalización no está disponible.

---

## Decisión 6: Notificaciones al propietario

**Decision**: Emitir evento Socket.IO `tienda:notificacion:nueva` a la sala `tenant:${tenantId}` cuando llega nueva valoración, comentario, pregunta o seguidor. El propietario filtra por tipo de evento en el frontend.

**Rationale**: Sigue el patrón del Artículo VI.1 (broadcast por tenant). El módulo social ya tiene `SocialSocketNotificador`; se extiende con nuevos métodos para tienda. Los eventos se emiten desde los use cases (Artículo VI.2).

**Alternatives considered**:
- Sala específica para el propietario: considerado pero innecesario para v1; la sala del tenant es suficiente dado que el propietario ya está conectado a ella.

---

## Inventario de lo ya implementado (no se reimplementa)

| Componente | Estado |
|-----------|--------|
| `Tienda`, `Configuracion` — Prisma | ✅ Existe en `10-tenant.prisma` |
| `TiendaReaccion/Comentario/Valoracion/Pregunta/Favorito/Seguidor` — Prisma | ✅ Existe en `80-social.prisma` |
| `Tenant.esTienda` flag | ✅ Existe |
| `Localizacion` con lat/long | ✅ Existe |
| 12 use cases sociales de tienda | ✅ En `social/application/tienda/` |
| Endpoints sociales tienda (reaccionar, comentar, valorar, etc.) | ✅ En `tienda-social.rest.ts` |
| Publicaciones CRUD (staff + public) | ✅ En `publicacion-staff.rest.ts` / `publicacion-publica.rest.ts` |

## Inventario de lo que falta implementar

| Componente | Acción |
|-----------|--------|
| `ProductoDestacado` — Prisma model | ➕ Nuevo en `10-tenant.prisma` |
| `TiendaPregunta.estado` default PENDIENTE→ACTIVO | 🔧 Migration |
| Módulo `tienda` (domain/application/infrastructure/adapters) | ➕ Nuevo |
| Directorio público `GET /public/tiendas` | ➕ Nuevo |
| Perfil público `GET /public/tiendas/:slug` | ➕ Nuevo |
| CRUD Configuracion tienda (tema, despliegue, activar/desactivar) | ➕ Nuevo |
| CRUD ProductoDestacado (agregar, quitar, reordenar) | ➕ Nuevo |
| `ocultar-pregunta-tienda` / `mostrar-pregunta-tienda` use cases | ➕ Nuevo |
| Notificaciones en tiempo real al propietario | ➕ Nuevo (extender ISocialNotificador) |
| Restricción PROPIETARIO/ADMIN en publicaciones | 🔧 Fix en `publicacion-staff.rest.ts` |
| `GET /tiendas/:slug/favorito` (check si es favorito del usuario) | ➕ Nuevo |
