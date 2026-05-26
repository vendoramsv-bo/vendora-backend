# Research: Capa Social de la Plataforma

**Feature**: 009-capa-social  
**Date**: 2026-05-25  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1 — Modelo de autorización tri-nivel para interacciones sociales

**Decision**: Se implementan tres niveles de acceso distintos en los adaptadores REST:
1. **Sin autenticación (público)**: GET de comentarios, valoraciones, preguntas y publicaciones publicadas. Cualquier visitante puede leer.
2. **Cualquier usuario autenticado**: POST de reacciones, comentarios, valoraciones, preguntas, respuestas, favoritos y seguimiento. El usuario tiene una sesión válida pero NO necesita ser miembro del tenant objetivo. El `tenantId` se deriva del elemento (producto, tienda, publicación) y NO de `session.activeOrganizationId`.
3. **Staff PROPIETARIO|ADMIN del tenant**: Crear, editar, cambiar estado y eliminar publicaciones; eliminar comentarios ajenos (moderación).

**Rationale**: El spec establece que "visitantes no autenticados solo pueden ver" y que "solo usuarios autenticados pueden crear interacciones". Los clientes de la plataforma no son necesariamente miembros de un tenant; son usuarios registrados que interactúan con el contenido público de cualquier negocio. Usar `session.activeOrganizationId` como fuente del `tenantId` excluiría a clientes que visitan tiendas ajenas.

**Impacto en implementación**:
- Nivel 1: Middleware `requireAuth` omitido; `tenantId` resuelto por slug (`GET /api/public/social/:slug/...`).
- Nivel 2: Middleware `requireAuth` presente; `tenantId` resuelto por el recurso solicitado (producto, tienda, publicación), no por la sesión.
- Nivel 3: Middleware `requireAuth` + verificación de rol en el tenant del recurso (`session.activeOrganizationId` + `role IN [PROPIETARIO, ADMIN]`).

**Alternativas rechazadas**:
- Exigir membership del tenant para cualquier escritura — excluiría a todos los clientes externos.
- Route-based tenant resolution universal — mezclaría semánticas de staff y cliente.

---

## Decision 2 — Tienda vs Tenant como entidad objetivo de interacciones

**Decision**: Las interacciones sociales sobre "el tenant (vitrina pública del negocio)" están modeladas en el schema como `TiendaXxx` que referencia el modelo `Tienda` (1-a-1 con `Tenant`), NO directamente al `Tenant`. La implementación debe:
1. Resolver `tiendaId` desde el slug del tenant al inicio de cada request (similar a `resolverRestauranteId` en el módulo restaurante).
2. Si el tenant tiene `esTienda=false`, no tendrá registro `Tienda` — en v1 las interacciones "sobre el tenant" están limitadas a tenants con `esTienda=true`. Tenants de otras verticales (consultorio, restaurante) sin Tienda quedan fuera del alcance de la vitrina social en v1.

**Rationale**: El schema `80-social.prisma` ya está definido y no se modifica. `TiendaReaccion`, `TiendaComentario`, etc., tienen `tiendaId` como FK, no `tenantId`. El registro `Tienda` se crea cuando un tenant activa el flag `esTienda`.

**Alternativas rechazadas**:
- Crear modelos `TenantReaccion` — requeriría modificar el schema (instrucción del usuario: no modificar).
- Reusar `tiendaId` de restaurantes — mezclaría conceptos distintos.

---

## Decision 3 — ProductoReaccion: emoji libre vs TipoReaccion enum

**Decision**: El schema tiene dos modelos de reacción inconsistentes entre sí:
- `ProductoReaccion`: campo `emoji String` + unique en `(productoId, userId, emoji)` → un usuario puede tener **múltiples emojis distintos** en el mismo producto.
- `TiendaReaccion` y `PublicacionReaccion`: campo `tipo TipoReaccion` + unique en `(tiendaId|publicacionId, userId)` → **una sola reacción** por usuario.

El schema NO se modifica. Comportamiento implementado:
- **Productos**: toggle de emoji individual. Hacer clic en un emoji lo agrega; hacer clic de nuevo en el mismo lo quita. El usuario puede acumular hasta N emojis distintos en el mismo producto. El frontend muestra los conteos por emoji (similar a Slack).
- **Tienda y Publicaciones**: una sola reacción por usuario (enum `TipoReaccion`). Una nueva reacción reemplaza la anterior (upsert).

**Rationale**: La consistencia de la experiencia ideal no puede conseguirse sin modificar el schema. La implementación acepta el diseño existente y expone el comportamiento diferenciado en la documentación de la API.

**Documentar en OpenAPI**: El endpoint de reacción a productos devuelve la lista completa de reacciones del usuario (array de emojis), mientras que el de tienda/publicaciones devuelve la reacción activa (un objeto o null).

---

## Decision 4 — Eliminación en cascada de comentarios a nivel aplicación

**Decision**: La eliminación de un comentario raíz con respuestas se gestiona en el caso de uso, NO mediante cascade de base de datos. El self-relation `padreId` en `ProductoComentario`, `TiendaComentario` y `PublicacionComentario` usa `onDelete: SetNull` (default de Prisma en relaciones opcionales). Si elimináramos el padre directamente, los hijos quedarían huérfanos con `padreId = null`.

El caso de uso `eliminar-comentario-X` debe:
1. Verificar que el solicitante es el autor del comentario O tiene rol de moderación.
2. Si el comentario es raíz (`padreId === null`): eliminar todas las respuestas primero (`deleteMany({ where: { padreId: comentarioId } })`), luego eliminar el padre.
3. Si el comentario es una respuesta: eliminarlo directamente.

**Rationale**: Spec dice "Opción B — eliminación en cascada". La ausencia de `onDelete: Cascade` en el self-relation impone la gestión aplicativa.

**Alternativas rechazadas**:
- Soft delete (`estado = ELIMINADO`) — spec eligió eliminación física; mantiene datos inútiles.
- Modificar schema para añadir `onDelete: Cascade` — instrucción del usuario: no modificar schema.

---

## Decision 5 — Socket.IO: sala estándar + sub-sala por elemento

**Decision**: Los eventos sociales se emiten siguiendo el patrón estándar del proyecto:
- Sala base: `tenant:${tenantId}` — todos los usuarios del tenant reciben todos los eventos sociales.
- Sub-sala opcional por elemento: `tenant:${tenantId}:producto:${productoId}` y `tenant:${tenantId}:publicacion:${publicacionId}` para que los clientes que estén viendo un elemento específico reciban solo los eventos de ese elemento.

El backend emite a ambas salas (`io.to(sala_base).to(sub_sala).emit(...)`). El frontend decide en cuál sala suscribirse según la pantalla activa.

**Eventos tipados** (agregados al contrato `ServerToClientEvents`):
- `social:reaccion` — nueva reacción en cualquier elemento del tenant
- `social:comentario` — nuevo comentario o respuesta
- `social:valoracion` — nueva valoración
- `social:publicacion-nueva` — nueva publicación publicada

**Rationale**: Consistente con el patrón de los módulos restaurante y ventas. El patrón `tenant:${id}` garantiza que los usuarios que naveguen la tienda reciben actualizaciones. Las sub-salas de elemento permiten que el frontend filtre sin lógica adicional de desempaquetado.

**Alternativas rechazadas**:
- Sala por elemento únicamente — requeriría que el cliente siempre sepa el ID exacto antes de conectarse.
- Polling HTTP — viola el requisito de tiempo real (< 2s).
