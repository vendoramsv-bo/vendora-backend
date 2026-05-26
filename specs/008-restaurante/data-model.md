# Data Model: Módulo de Restaurante

**Feature**: 008-restaurante  
**Date**: 2026-05-25  
**Source**: `prisma/70-restaurante.prisma` (schema `restaurante`) — usado tal cual, sin modificaciones

> **Instrucción del usuario**: El esquema ya existe en `prisma/70-restaurante.prisma`. No se crea ni deriva un nuevo modelo de datos.

---

## Modelos (7)

### TiempoComida

Franja horaria del restaurante (desayuno, almuerzo, cena, etc.).

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | String (cuid) | PK |
| restauranteId | String | FK → Restaurante, onDelete: Cascade |
| nombre | String | — |
| horaInicio | String | formato "HH:MM" |
| horaFin | String | formato "HH:MM" |
| orden | Int | default 0 |
| icono | String? | emoji o ruta |
| estado | Estado | default ACTIVO |
| createdAt / updatedAt | DateTime | — |
| createdById / updatedById | String? | auditoría |

**Índices**: `@@unique([restauranteId, nombre])`, `@@index([restauranteId, orden])`

**Invariantes**:
- Nombre único por restaurante
- horaFin debe ser posterior a horaInicio

---

### Menu

Carta del restaurante con ciclo de vida (borrador → aprobado → publicado → archivado).

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | String (cuid) | PK |
| restauranteId | String | FK → Restaurante |
| nombre | String | — |
| tipo | TipoMenu | default DIARIO |
| fechaInicio | DateTime | inicio vigencia |
| fechaFin | DateTime | fin vigencia |
| descripcion | String? | — |
| imagenPortada | String? | URL R2 |
| tema | String? | — |
| creadoPorId | String? | FK → TenantMember |
| estado | EstadoMenu | default BORRADOR |
| fechaPublicacion | DateTime? | — |
| fechaPublicacionRRSS | DateTime? | — |
| createdAt / updatedAt | DateTime | — |
| createdById / updatedById | String? | auditoría |

**Índices**: `@@index([restauranteId, tipo, fechaInicio])`, `@@index([restauranteId, estado])`

**Invariantes**:
- No publicable con 0 ítems con `disponible = true` (FR-009)
- Pueden coexistir múltiples menús PUBLICADO simultáneamente (FR-008)
- Solo menús PUBLICADO son visibles al público

---

### MenuItem

Ítem del catálogo asignado a un menú, con precio propio.

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | String (cuid) | PK |
| menuId | String | FK → Menu, Cascade |
| tiempoComidaId | String | FK → TiempoComida, Cascade |
| productoId | String | FK → Producto (catalogo), Cascade |
| nombreSnapshot | String | snapshot del nombre al agregar |
| descripcionSnapshot | String? | — |
| imagenSnapshot | String? | — |
| precio | Decimal(10,2) | precio en este menú |
| esEspecial | Boolean | default false |
| destacado | Boolean | default false |
| disponible | Boolean | default true |
| orden | Int | default 0 |
| notaMenu | String? | — |
| estado | Estado | default ACTIVO |
| createdAt / updatedAt | DateTime | — |

**Índices**: `@@unique([menuId, tiempoComidaId, productoId])`, `@@index([menuId, orden])`

**Invariantes**:
- Un producto solo puede aparecer una vez por combinación menú+tiempoComida
- El precio es independiente del precio base del catálogo (FR-007)
- Los snapshots se congela al agregar el ítem (no se actualizan si el producto cambia)

---

### Reserva

Pedido de un cliente con código único y flujo de estados.

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | String (cuid) | PK |
| restauranteId | String | FK → Restaurante, Cascade |
| codigo | String | formato RST-YYYYMMDD-XXXX |
| clienteId | String? | FK → Cliente (ventas), SetNull |
| clienteNombre | String | requerido siempre |
| clienteTelefono | String? | — |
| clienteEmail | String? | — |
| menuId | String? | FK → Menu, SetNull (snapshot histórico) |
| fechaReserva | DateTime | default now() |
| fechaLlegada | DateTime | — |
| numeroComensales | Int | default 1 |
| numeroMesa | String? | asignada al confirmar |
| observaciones | String? | — |
| canalOrigen | String? | WEB/APP/WHATSAPP/TELEFONO/PRESENCIAL |
| totalCantidad | Int | default 0 |
| totalEstimado | Decimal(10,2) | calculado de detalles |
| estado | EstadoReserva | default RESERVADA |
| atendidaPorId | String? | FK → TenantMember |
| fechaConfirmacion | DateTime? | — |
| fechaCancelacion | DateTime? | — |
| motivoCancelacion | String? | — |
| ventaId | String? | FK → Venta (unique) |
| createdAt / updatedAt | DateTime | — |
| createdById / updatedById | String? | auditoría |

**Índices**: `@@unique([restauranteId, codigo])`, `@@index([restauranteId, fechaLlegada])`, `@@index([restauranteId, estado])`, `@@index([clienteId])`

**Invariantes**:
- Código único por restaurante (FR-010)
- clienteId puede ser null para clientes ocasionales (FR-011b)
- clienteNombre siempre requerido
- ventaId único (una reserva genera como máximo una venta)
- Flujo de estados: RESERVADA → CONFIRMADA → EN_PREPARACION → LISTA → ENTREGADA → PAGADA
- Transiciones alternativas: CANCELADA y NO_ASISTIO disponibles desde cualquier estado anterior a PAGADA

---

### ReservaDetalle

Ítem individual de una reserva con estado de cocina propio.

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | String (cuid) | PK |
| reservaId | String | FK → Reserva, Cascade |
| menuItemId | String? | FK → MenuItem, SetNull |
| productoId | String | FK → Producto, Restrict |
| productoNombre | String | snapshot al reservar |
| productoImagen | String? | snapshot al reservar |
| cantidad | Int | default 1 |
| precio | Decimal(10,2) | snapshot del precio del MenuItem al reservar (FR-007) |
| subtotal | Decimal(10,2) | = cantidad × precio |
| observacion | String? | "sin cebolla", "término medio" |
| estadoCocina | EstadoCocina | default PENDIENTE |
| createdAt / updatedAt | DateTime | — |

**Índice**: `@@index([reservaId])`

**Invariantes**:
- precio y productoNombre son snapshots inmutables tras la creación
- subtotal = cantidad × precio (se calcula en el use case)
- Flujo estadoCocina: PENDIENTE → EN_PREPARACION → LISTO (→ ENTREGADO solo por MESERO)
- COCINA gestiona hasta LISTO; MESERO marca ENTREGADO (FR-016)
- Todos los ítems en ENTREGADO → reserva avanza a LISTA automáticamente (FR-018)

---

### PedidoEstadoLog

Log de cambios de estado de la Reserva (nivel de reserva, no de ítem).

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | String (cuid) | PK |
| reservaId | String | FK → Reserva, Cascade |
| estadoAnterior | EstadoReserva? | — |
| estadoNuevo | EstadoReserva | — |
| cambiadoPorId | String? | FK → TenantMember |
| nota | String? | — |
| fecha | DateTime | default now() |

**Índice**: `@@index([reservaId, fecha])`

**Uso para trazabilidad de ítems (gap v1)**: La nota puede codificar `"ITEM:${detalleId}:${estadoCocina}"` para aproximar el log de cambios de estado de ítem. Un campo real `detalleId` se añade en v1.1.

---

### PublicacionMenuRRSS

Registro de publicaciones automáticas del menú en redes sociales.

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | String (cuid) | PK |
| restauranteId | String | FK → Restaurante, Cascade |
| menuId | String | FK → Menu, Cascade |
| publicacionId | String? | FK → Publicacion (social) |
| redSocial | RedSocial | — |
| urlPublicacion | String? | URL del post en la red |
| urlImagenGenerada | String? | URL R2 del PNG generado |
| fechaProgramada | DateTime? | cuándo publicar |
| fechaPublicada | DateTime? | cuándo se publicó |
| alcance | Int? | métrica |
| reacciones | Int? | métrica |
| comentarios | Int? | métrica |
| estado | EstadoPublicacionRRSS | default PROGRAMADA |
| errorMensaje | String? | — |
| creadoPorId | String? | FK → TenantMember |
| createdAt / updatedAt | DateTime | — |
| createdById / updatedById | String? | auditoría |

**Índices**: `@@index([restauranteId, fechaProgramada])`, `@@index([menuId])`

---

## Enums (6)

| Enum | Valores |
|------|---------|
| TipoMenu | DIARIO, SEMANAL, ESPECIAL, PERMANENTE, EVENTO |
| EstadoMenu | BORRADOR, APROBADO, PUBLICADO, ARCHIVADO, CANCELADO |
| EstadoReserva | RESERVADA, CONFIRMADA, EN_PREPARACION, LISTA, ENTREGADA, PAGADA, CANCELADA, NO_ASISTIO |
| EstadoCocina | PENDIENTE, EN_PREPARACION, LISTO, ENTREGADO, CANCELADO |
| RedSocial | INSTAGRAM, FACEBOOK, WHATSAPP, TIKTOK, TWITTER_X, OTRO |
| EstadoPublicacionRRSS | BORRADOR, PROGRAMADA, PUBLICANDO, PUBLICADA, FALLIDA, CANCELADA |

**Nota sobre RedSocial**: El enum incluye WHATSAPP, TIKTOK, TWITTER_X y OTRO. La spec FR-021 restringe la publicación automática a INSTAGRAM y FACEBOOK únicamente. El enum más amplio permite uso futuro sin migración.

---

## Modelos referenciados de otros schemas

| Modelo | Schema | Relación |
|--------|--------|----------|
| Restaurante | tenant | TiempoComida, Menu, Reserva, PublicacionMenuRRSS → Restaurante |
| TenantMember | tenant | Menu.creadoPorId, Reserva.atendidaPorId, PedidoEstadoLog.cambiadoPorId → TenantMember |
| Producto | catalogo | MenuItem.productoId, ReservaDetalle.productoId → Producto |
| Cliente | ventas | Reserva.clienteId → Cliente |
| Venta | ventas | Reserva.ventaId → Venta (implicit, no FK en Prisma) |

---

## Gaps conocidos (schema actual vs spec)

| Gap | Spec | Schema actual | Plan v1 |
|-----|------|---------------|---------|
| **ClienteRestaurante auth** | FR-011a: cuenta email+contraseña propia | Cliente (ventas) sin passwordHash | Lookup por email en v1; auth completa en v1.1 |
| **Log estado cocina por ítem** | FR-017: timestamp + actor por ítem | Solo `ReservaDetalle.estadoCocina` + `updatedAt` | Nota en PedidoEstadoLog; tabla real en v1.1 |
| **RedSocial enum scope** | FR-021: solo Instagram + Facebook | Enum incluye más plataformas | Validar en application layer; enum se reutiliza en v1.1 |

---

## Diagrama de relaciones clave

```
Tenant (tenant)
  └── Restaurante (tenant)
        ├── TiempoComida[]
        ├── Menu[]
        │     └── MenuItem[] → TiempoComida, Producto (catalogo)
        ├── Reserva[] → Cliente? (ventas), Menu?
        │     ├── ReservaDetalle[] → MenuItem?, Producto
        │     └── PedidoEstadoLog[]
        └── PublicacionMenuRRSS[] → Menu
```
