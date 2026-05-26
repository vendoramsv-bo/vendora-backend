# Research: Módulo de Restaurante

**Feature**: 008-restaurante  
**Date**: 2026-05-25  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1 — ClienteRestaurante vs Cliente (ventas)

**Decision**: Usar el modelo `Cliente` existente del schema `ventas` como base para los clientes del restaurante. No se crea un modelo separado `ClienteRestaurante`.

**Rationale**: El schema `70-restaurante.prisma` ya define `Reserva.clienteId → Cliente` (ventas). El modelo `Cliente` tiene `nombre`, `email?`, `telefono?`, suficientes para identificar un comensal. Para "cliente registrado" (FR-011a): crear/encontrar un `Cliente` por email. Para "cliente ocasional" (FR-011b): dejar `clienteId = null` y usar los campos inline `clienteNombre`/`clienteTelefono`/`clienteEmail` de `Reserva`.

**Autenticación pública diferida**: La spec requiere cuenta email+contraseña para clientes registrados. El modelo `Cliente` no tiene campo `passwordHash`. La autenticación pública completa (JWT para comensales) queda fuera del scope de v1; en esta iteración, un "cliente registrado" se identifica por email y puede consultar su historial de reservas mediante un endpoint autenticado por token de sesión estándar. Un endpoint público de lookup devuelve reservas por email + código de reserva sin password completo.

**Alternativas rechazadas**:
- Nuevo modelo `ClienteRestauranteCred` — añadiría un 8.° modelo al schema; el usuario instruyó no modificar el schema
- Usar `User` de Better-Auth — mezclaría el sistema de staff con el de comensales públicos

---

## Decision 2 — Generación de imagen para RRSS

**Decision**: `satori` (v0.10+) + `@resvg/resvg-js` para generar imágenes PNG 1080×1080 server-side.

**Rationale**: `satori` convierte JSX/HTML a SVG puro en Node.js sin browser. `@resvg/resvg-js` renderiza el SVG a PNG con binarios nativos (WASM disponible como fallback). El resultado es < 50 MB de dependencias vs > 300 MB de Puppeteer. La imagen se carga en Cloudflare R2 y su URL se pasa a la Graph API. Flujo: `MenuItem[]` → template JSX → SVG (satori) → PNG Buffer (@resvg) → upload R2 → URL.

**Alternativas rechazadas**:
- Puppeteer / Playwright — demasiado pesado para un Background Worker en Render
- Canvas (node-canvas) — requiere binarios nativos libnodo difíciles de cross-compilar

---

## Decision 3 — Graph API (Instagram + Facebook)

**Decision**: Meta Graph API v20+ con token de larga vida almacenado en `Restaurante` (campo JSON `configRRSS`). Flujo separado por plataforma:
- **Instagram Business**: `POST /v20/{ig-user-id}/media` (crear container) → `POST /v20/{ig-user-id}/media_publish` (publicar)
- **Facebook Page**: `POST /v20/{page-id}/photos` (subir foto + mensaje) — un solo paso

**Almacenamiento de credenciales**: `Restaurante.configuracion` (JSON) almacena `{ instagram: { userId, accessToken, expiresAt }, facebook: { pageId, accessToken, expiresAt } }`. El token se cifra a nivel de infraestructura (Render secrets env var con clave AES-256). La rotación de tokens es responsabilidad del admin (UI de configuración muestra días restantes).

**Métricas**: `GET /v20/{media-id}/insights` para alcance e impresiones, se consulta ~1 hora después de publicar vía un segundo job BullMQ.

**Alternativas rechazadas**:
- OAuth flow automático — requiere redirect URI público; la configuración manual de tokens es suficiente para v1

---

## Decision 4 — Socket.IO rooms para restaurante

**Decision**: Salas por módulo según Artículo VI.4:
- `tenant:${tenantId}` — sala base para todos los eventos del tenant (ya existe en infraestructura)
- `tenant:${tenantId}:restaurante` — todos los usuarios del restaurante (ADMIN, ENCARGADO, MESERO, CHEF)
- `tenant:${tenantId}:cocina` — solo rol CHEF/COCINA; filtra eventos de cambios de estado de ítems

**Join strategy**: Al autenticarse por WebSocket, el servidor une al cliente a las salas según su rol. El `IRestauranteNotificador` emitirá a la sala específica según el tipo de evento:
- `reserva:creada` / `reserva:actualizada` → `tenant:${tenantId}:restaurante`
- `cocina:plato-actualizado` → `tenant:${tenantId}:cocina` + `tenant:${tenantId}:restaurante`

---

## Decision 5 — BullMQ queue para publicación programada

**Decision**: Queue `restaurante-rrss` en Redis. Job data: `{ publicacionId, restauranteId, tenantId }`. El job se añade cuando se crea/actualiza `PublicacionMenuRRSS.fechaProgramada`. El worker: carga la publicación → genera imagen → llama Graph API → actualiza estado → emite notificación. Manejo de fallos: `attempts: 3, backoff: { type: 'exponential', delay: 60000 }`. Al agotar intentos: marca estado `FALLIDA` + notificación interna vía `Notificacion` model.

**Delayed jobs**: `bullmq` soporta `delay` calculado como `fechaProgramada.getTime() - Date.now()`. El job se añade con ese delay al crear la publicación programada.

---

## Decision 6 — Estado de cocina por ítem (FR-017 — gap de schema)

**Situación**: El schema actual tiene `ReservaDetalle.estadoCocina` (campo directo) y `PedidoEstadoLog` que solo registra cambios de `EstadoReserva` (no de ítems). La spec FR-017 pide registrar cada cambio de estado de ítem con timestamp y actor.

**Decision**: Aceptar el schema actual para v1. El timestamp de cambio de estado se aproxima con `ReservaDetalle.updatedAt`. El actor se pierde en el modelo actual (no hay campo para ello en `ReservaDetalle`). En el domain/application layer, cada `ActualizarEstadoCocinaUseCase` registra adicionalmente un `PedidoEstadoLog` con una nota `"ITEM:${detalleId}:${estadoNuevo}"` para mantener trazabilidad mínima. La arquitectura hexagonal permite añadir un `ReservaDetalleEstadoLog` real en v1.1 sin cambiar los casos de uso.

**Alternativas rechazadas**:
- Nueva migración con `ReservaDetalleEstadoLog` — el usuario instruyó no modificar el schema de restaurante

---

## Decision 7 — Código de reserva (FR-010)

**Decision**: Formato `RST-YYYYMMDD-XXXX` donde `XXXX` es un contador por restaurante+día (secuencia con padding de 4 dígitos). Generado en el use case contando las reservas del mismo día y sumando 1. El `@@unique([restauranteId, codigo])` del schema garantiza unicidad.

**Manejo de race condition**: En escenario de alta concurrencia (≥ 2 reservas simultáneas), el `@@unique` de Prisma lanzará un error de constraint que el use case atrapa y reintenta con el siguiente contador. Para v1 (escala esperada: < 50 reservas/día), 3 intentos son suficientes.

---

## Decision 8 — Caja y pago de reservas (FR-014, FR-015)

**Decision**: Reutilizar el port `IVentaService` del módulo de consultorio como patrón. Definir `IRestauranteVentaService` con firma:
```typescript
crearVenta(params: {
  tenantId: string;
  restauranteId: string;
  reservaId: string;
  reservaCodigo: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number; subtotal: number }>;
  total: number;
  cajaId: string;
  cajeroId: string;
}): Promise<{ ventaId: string; numeroVenta: string }>
```
La implementación en `infrastructure/` usa `IVentaService` cross-module con `referenciaTipo = "RESERVA_RESTAURANTE"` y `referenciaId = reserva.codigo`. El campo `Reserva.ventaId` almacena el ID de la venta creada.

---

## Decision 9 — Guard y roles (FR-001, FR-002)

**Decision**: Middleware `requireRestaurante` que verifica `tenant.esRestaurante`. Permisos diferenciados:
- `PROPIETARIO | ADMIN | ENCARGADO` → gestión completa (perfil, menús, reservas, publicación)
- `MESERO | VENDEDOR` → reservas: ver + actualizar estado hasta ENTREGADA; marcar ítems ENTREGADO
- `CHEF` → panel cocina: actualizar estado ítems PENDIENTE→EN_PREPARACION→LISTO

Los roles `CHEF` y `MESERO` son extensiones del campo `role` en `TenantMember` ya existente.

---

## Decision 10 — Menú público sin auth

**Decision**: Los endpoints de consulta pública (`GET /public/restaurante/:slug/menus`, `GET /public/restaurante/:slug/menus/:menuId`) no requieren autenticación. El tenant se resuelve por `slug` del restaurante en la URL. Solo se devuelven menús en estado `PUBLICADO` con ítems `disponible = true`.

Para crear una reserva sin cuenta (cliente ocasional), el endpoint `POST /public/restaurante/:slug/reservas` tampoco requiere auth.

Para clientes registrados (lookup por email), en v1 se implementa un endpoint simplificado: `GET /public/restaurante/:slug/mis-reservas?email=...&codigo=...` que devuelve las reservas del cliente sin sistema de auth completo. La autenticación completa de clientes públicos queda para v1.1.
