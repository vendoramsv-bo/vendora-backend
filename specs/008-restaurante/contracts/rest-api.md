# API Contracts: Módulo de Restaurante

**Feature**: 008-restaurante  
**Date**: 2026-05-25  
**Transport**: REST (Hono + @hono/zod-openapi) + Socket.IO  
**Base path**: `/api/v1`  
**Auth**: Better-Auth session cookie (staff). Endpoints públicos marcados como `[PUBLIC]`.

---

## Guard middleware

Todos los endpoints bajo `/restaurante/*` aplican en orden:
1. `requireAuth` — sesión válida
2. `requireTenant` — tenant activo resuelto desde sesión
3. `requireRestaurante` — `tenant.esRestaurante === true` (devuelve 403 si no)

Excepciones explícitas: rutas `[PUBLIC]` debajo de `/public/restaurante/:slug/`.

---

## Perfil del Restaurante

### GET `/restaurante/perfil`
Obtener configuración del restaurante del tenant activo.

**Roles**: todos  
**Response 200**:
```json
{
  "id": "string",
  "nombre": "string",
  "capacidadMesas": 20,
  "capacidadComensales": 80,
  "duracionPromedioMinutos": 60,
  "servicios": ["MESA", "DELIVERY", "PARA_LLEVAR"],
  "configuracionRRSS": {
    "instagram": { "habilitado": true, "horaPublicacion": "10:00" },
    "facebook": { "habilitado": false, "horaPublicacion": null }
  },
  "estado": "ACTIVO",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### PUT `/restaurante/perfil`
Actualizar configuración del restaurante.

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Body**:
```json
{
  "capacidadMesas": 20,
  "capacidadComensales": 80,
  "duracionPromedioMinutos": 60,
  "servicios": ["MESA", "DELIVERY"],
  "configuracionRRSS": {
    "instagram": { "habilitado": true, "horaPublicacion": "10:00", "accessToken": "..." },
    "facebook": { "habilitado": true, "horaPublicacion": "10:00", "pageId": "...", "accessToken": "..." }
  }
}
```
**Response 200**: perfil actualizado (mismo shape que GET)  
**Errors**: 400 validación, 403 sin permiso

---

## Tiempos de Comida

### GET `/restaurante/tiempos-comida`
Listar franjas horarias ordenadas por `orden`.

**Roles**: todos  
**Query**: `estado` (ACTIVO|INACTIVO, default ACTIVO)  
**Response 200**: `{ data: TiempoComida[], meta: { total } }`

### POST `/restaurante/tiempos-comida`
Crear nueva franja.

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Body**:
```json
{
  "nombre": "ALMUERZO",
  "horaInicio": "12:00",
  "horaFin": "15:00",
  "orden": 2,
  "icono": "🍽️"
}
```
**Response 201**: TiempoComida creado  
**Errors**: 409 `TIEMPO_COMIDA_DUPLICADO` si ya existe ese nombre para el restaurante

### GET `/restaurante/tiempos-comida/:id`
Obtener franja por ID.

**Response 200**: TiempoComida | 404 `TIEMPO_COMIDA_NO_ENCONTRADO`

### PUT `/restaurante/tiempos-comida/:id`
Actualizar franja.

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Body**: campos opcionales del POST  
**Response 200**: TiempoComida actualizado

### DELETE `/restaurante/tiempos-comida/:id`
Eliminar franja (soft delete → estado INACTIVO si tiene ítems asociados; hard delete si está vacía).

**Roles**: PROPIETARIO, ADMIN  
**Response 204** | **Errors**: 409 `TIEMPO_COMIDA_EN_USO` si tiene menuItems activos

---

## Menús

### GET `/restaurante/menus`
Listar menús con paginación y filtros.

**Roles**: todos (staff)  
**Query params** (Artículo IV):
- `take` (default 20, max 100)
- `skip` / cursor
- `estado` (BORRADOR|APROBADO|PUBLICADO|ARCHIVADO)
- `tipo` (DIARIO|SEMANAL|ESPECIAL|PERMANENTE|EVENTO)
- `desde` / `hasta` (fechaInicio range)
- `order` field + asc|desc

**Response 200**: `{ data: Menu[], meta: { take, total, hasMore, nextCursor } }`

### POST `/restaurante/menus`
Crear menú en estado BORRADOR.

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Body**:
```json
{
  "nombre": "Menú del lunes",
  "tipo": "DIARIO",
  "fechaInicio": "2026-06-02T00:00:00Z",
  "fechaFin": "2026-06-02T23:59:59Z",
  "descripcion": "Menú especial de temporada"
}
```
**Response 201**: Menu creado (estado BORRADOR)

### GET `/restaurante/menus/:id`
Obtener menú por ID con sus ítems.

**Response 200**: Menu con `items: MenuItem[]` agrupados por tiempoComida  
**Errors**: 404 `MENU_NO_ENCONTRADO`

### PUT `/restaurante/menus/:id`
Actualizar campos del menú (solo en BORRADOR o APROBADO).

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Errors**: 422 `MENU_NO_EDITABLE` si está PUBLICADO o ARCHIVADO

### PATCH `/restaurante/menus/:id/estado`
Transición de estado del menú.

**Roles**: PROPIETARIO, ADMIN (ENCARGADO puede aprobar)  
**Body**:
```json
{ "estado": "PUBLICADO" }
```
**Transiciones válidas**:
- BORRADOR → APROBADO
- APROBADO → PUBLICADO (requiere ≥1 ítem disponible)
- PUBLICADO → ARCHIVADO
- BORRADOR → CANCELADO

**Errors**:
- 422 `MENU_SIN_ITEMS_DISPONIBLES` — al intentar publicar sin ítems con disponible=true
- 422 `TRANSICION_INVALIDA` — estado destino no permitido desde el estado actual

---

## Ítems de Menú

### GET `/restaurante/menus/:menuId/items`
Listar ítems del menú agrupados por tiempoComida.

**Response 200**: `{ data: MenuItem[], meta: { total } }`

### POST `/restaurante/menus/:menuId/items`
Agregar ítem al menú.

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Body**:
```json
{
  "productoId": "cuid...",
  "tiempoComidaId": "cuid...",
  "precio": 15.50,
  "esEspecial": false,
  "destacado": true,
  "disponible": true,
  "orden": 1,
  "notaMenu": "Sin gluten"
}
```
**Response 201**: MenuItem creado con snapshots del producto  
**Errors**: 409 `ITEM_DUPLICADO` si ya existe esa combinación producto+tiempoComida en el menú

### PUT `/restaurante/menus/:menuId/items/:itemId`
Actualizar ítem de menú.

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Body**: campos opcionales (precio, flags, orden, notaMenu)  
**Response 200**: MenuItem actualizado

### DELETE `/restaurante/menus/:menuId/items/:itemId`
Eliminar ítem del menú (solo si no hay reservas activas referenciando este ítem).

**Roles**: PROPIETARIO, ADMIN  
**Errors**: 409 `ITEM_CON_RESERVAS_ACTIVAS`

---

## Reservas (Staff)

### GET `/restaurante/reservas`
Listar reservas con filtros.

**Roles**: todos (staff)  
**Query params** (Artículo IV):
- `take`, `skip`/cursor
- `estado` (EstadoReserva)
- `fecha` (YYYY-MM-DD — filtra por fechaLlegada)
- `desde` / `hasta`
- `search` — busca en codigo, clienteNombre

**Response 200**: `{ data: Reserva[], meta: { take, total, hasMore, nextCursor } }`

### GET `/restaurante/reservas/:id`
Obtener reserva con detalles y log de estados.

**Response 200**: Reserva con `detalles: ReservaDetalle[]` y `estadosLog: PedidoEstadoLog[]`  
**Errors**: 404 `RESERVA_NO_ENCONTRADA`

### PATCH `/restaurante/reservas/:id/estado`
Transición de estado de la reserva.

**Roles según estado destino**:
- → CONFIRMADA: MESERO, ENCARGADO, ADMIN
- → EN_PREPARACION: MESERO, ENCARGADO, ADMIN
- → LISTA: automático (ver FR-018) o MESERO manualmente
- → ENTREGADA: MESERO, ENCARGADO
- → PAGADA: VENDEDOR, CAJERO, ENCARGADO, ADMIN (ver endpoint pago)
- → CANCELADA: cualquier rol staff
- → NO_ASISTIO: MESERO, ENCARGADO

**Body**:
```json
{
  "estado": "CONFIRMADA",
  "nota": "Cliente llegó con 15 min de adelanto",
  "numeroMesa": "5"
}
```
**Response 200**: Reserva actualizada + evento Socket.IO `reserva:actualizada`  
**Errors**: 422 `TRANSICION_INVALIDA`

### POST `/restaurante/reservas/:id/pagar`
Registrar pago y crear venta en caja.

**Roles**: VENDEDOR, CAJERO, ENCARGADO, ADMIN  
**Body**:
```json
{
  "cajaId": "cuid...",
  "cajeroId": "cuid..."
}
```
**Response 200**:
```json
{
  "reserva": { "...": "..." },
  "venta": { "ventaId": "cuid...", "numeroVenta": "V-2026-001" }
}
```
**Errors**:
- 422 `CAJA_NO_ABIERTA` — no hay apertura de caja activa (FR-015)
- 422 `RESERVA_YA_PAGADA` — ventaId ya existe

---

## Panel de Cocina

### GET `/restaurante/cocina`
Listar reservas activas con ítems pendientes para el panel de cocina.

**Roles**: CHEF, MESERO, ENCARGADO, ADMIN  
**Query**:
- `estado` (default: `EN_PREPARACION,CONFIRMADA`) — estados de reserva a mostrar
- `order` por fechaLlegada asc (FR-017: más antiguos primero)

**Response 200**: `{ data: ReservaCocinaView[], meta: { total } }`

```json
{
  "data": [
    {
      "reservaId": "cuid",
      "codigo": "RST-20260602-0001",
      "fechaLlegada": "ISO8601",
      "numeroMesa": "5",
      "numeroComensales": 3,
      "detalles": [
        {
          "id": "cuid",
          "productoNombre": "Lomo saltado",
          "cantidad": 2,
          "observacion": "sin cebolla",
          "estadoCocina": "PENDIENTE",
          "updatedAt": "ISO8601"
        }
      ]
    }
  ]
}
```

### PATCH `/restaurante/cocina/items/:detalleId/estado`
Actualizar estado de cocina de un ítem de reserva.

**Roles**:
- PENDIENTE → EN_PREPARACION → LISTO: CHEF
- LISTO → ENTREGADO: MESERO (solo)

**Body**:
```json
{ "estadoCocina": "EN_PREPARACION" }
```
**Response 200**: ReservaDetalle actualizado  
**Side effects**:
- Emite evento Socket.IO `cocina:plato-actualizado` a salas `tenant:${tenantId}:cocina` y `tenant:${tenantId}:restaurante`
- Si todos los ítems de la reserva pasan a ENTREGADO → actualiza automáticamente `Reserva.estado` a LISTA + emite `reserva:actualizada`

**Errors**: 422 `TRANSICION_COCINA_INVALIDA`, 403 `ROL_SIN_PERMISO`

---

## Publicación en Redes Sociales

### GET `/restaurante/publicaciones`
Listar publicaciones programadas e históricas.

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Query**:
- `take`, `skip`/cursor
- `redSocial` (INSTAGRAM|FACEBOOK)
- `estado` (EstadoPublicacionRRSS)
- `desde` / `hasta`

**Response 200**: `{ data: PublicacionMenuRRSS[], meta: { take, total, hasMore, nextCursor } }`

### POST `/restaurante/publicaciones`
Programar publicación de un menú.

**Roles**: PROPIETARIO, ADMIN, ENCARGADO  
**Body**:
```json
{
  "menuId": "cuid...",
  "redSocial": "INSTAGRAM",
  "fechaProgramada": "2026-06-02T10:00:00Z"
}
```
**Response 201**: PublicacionMenuRRSS en estado PROGRAMADA + job BullMQ encolado  
**Errors**:
- 422 `MENU_NO_PUBLICADO` — el menú debe estar en estado PUBLICADO
- 422 `PLATAFORMA_NO_CONFIGURADA` — token de la red social no configurado en el perfil
- 400 `FECHA_EN_PASADO`

### GET `/restaurante/publicaciones/:id`
Obtener detalle de publicación con métricas.

**Response 200**: PublicacionMenuRRSS | 404 `PUBLICACION_NO_ENCONTRADA`

### DELETE `/restaurante/publicaciones/:id`
Cancelar publicación programada (solo si estado = PROGRAMADA).

**Roles**: PROPIETARIO, ADMIN  
**Response 204** | **Errors**: 422 `PUBLICACION_YA_PROCESADA`

---

## Endpoints Públicos (sin auth)

### GET `/public/restaurante/:slug/menus` `[PUBLIC]`
Listar menús publicados del restaurante visible al cliente.

**Query**:
- `horaLlegada` (HH:MM) — opcional; filtra por TiempoComida vigente en esa hora
- `fecha` (YYYY-MM-DD) — default hoy

**Response 200**: `{ data: MenuPublicoView[] }` — solo ítems con `disponible = true`

### GET `/public/restaurante/:slug/menus/:menuId` `[PUBLIC]`
Obtener detalle de un menú publicado con ítems ordenados por tiempoComida.

**Errors**: 404 si no existe o no está PUBLICADO

### POST `/public/restaurante/:slug/reservas` `[PUBLIC]`
Crear reserva como cliente (registrado u ocasional).

**Body**:
```json
{
  "menuId": "cuid...",
  "clienteEmail": "juan@example.com",
  "clienteNombre": "Juan Pérez",
  "clienteTelefono": "+51 999 888 777",
  "fechaLlegada": "2026-06-02T13:00:00Z",
  "numeroComensales": 3,
  "observaciones": "Mesa cerca de la ventana",
  "items": [
    {
      "menuItemId": "cuid...",
      "cantidad": 2,
      "observacion": "sin cebolla"
    }
  ]
}
```
**Response 201**:
```json
{
  "codigo": "RST-20260602-0001",
  "fechaLlegada": "ISO8601",
  "estado": "RESERVADA",
  "total": 31.00
}
```
**Side effects**: emite `reserva:creada` al restaurante  
**Errors**:
- 422 `MENU_NO_DISPONIBLE` — menú no está PUBLICADO
- 422 `ITEM_NO_DISPONIBLE` — ítem con `disponible = false`
- 422 `HORA_FUERA_DE_SERVICIO`

### GET `/public/restaurante/:slug/mis-reservas` `[PUBLIC]`
Consultar reservas de un cliente por email (v1 sin auth completa).

**Query**: `email` (requerido) + `codigo` (opcional)  
**Response 200**: `{ data: ReservaResumenPublico[] }` — solo datos del cliente solicitante  
**Errors**: 400 si email vacío

---

## Eventos Socket.IO

**Contrato**: `RestauranteServerToClientEvents`

### `reserva:creada`
Emitido cuando se crea una reserva (pública o staff).  
**Sala**: `tenant:${tenantId}:restaurante`

```typescript
{
  event: "reserva:creada",
  data: {
    reservaId: string;
    codigo: string;
    clienteNombre: string;
    fechaLlegada: string; // ISO8601
    numeroComensales: number;
    estado: EstadoReserva;
    totalItems: number;
  }
}
```

### `reserva:actualizada`
Emitido en cada cambio de estado de la reserva.  
**Sala**: `tenant:${tenantId}:restaurante`

```typescript
{
  event: "reserva:actualizada",
  data: {
    reservaId: string;
    codigo: string;
    estadoAnterior: EstadoReserva;
    estadoNuevo: EstadoReserva;
    cambiadoPorId: string;
    fecha: string; // ISO8601
  }
}
```

### `cocina:plato-actualizado`
Emitido cuando cambia el `estadoCocina` de un ReservaDetalle.  
**Salas**: `tenant:${tenantId}:cocina` + `tenant:${tenantId}:restaurante`

```typescript
{
  event: "cocina:plato-actualizado",
  data: {
    reservaId: string;
    codigo: string;
    detalleId: string;
    productoNombre: string;
    estadoAnterior: EstadoCocina;
    estadoNuevo: EstadoCocina;
    cambiadoPorId: string;
    fecha: string; // ISO8601
  }
}
```

---

## Códigos de Error del Dominio

| Código | HTTP | Descripción |
|--------|------|-------------|
| `RESTAURANTE_NO_ENCONTRADO` | 404 | Tenant sin perfil de restaurante |
| `TIEMPO_COMIDA_NO_ENCONTRADO` | 404 | Franja horaria inexistente |
| `TIEMPO_COMIDA_DUPLICADO` | 409 | Nombre ya existe para este restaurante |
| `TIEMPO_COMIDA_EN_USO` | 409 | Franja con ítems activos, no eliminable |
| `MENU_NO_ENCONTRADO` | 404 | Menú inexistente |
| `MENU_NO_EDITABLE` | 422 | Menú PUBLICADO/ARCHIVADO no editable |
| `MENU_SIN_ITEMS_DISPONIBLES` | 422 | Publicar requiere ≥1 ítem disponible |
| `MENU_NO_PUBLICADO` | 422 | Acción requiere menú en estado PUBLICADO |
| `ITEM_DUPLICADO` | 409 | Producto+TiempoComida ya existe en el menú |
| `ITEM_NO_DISPONIBLE` | 422 | Ítem marcado como no disponible |
| `ITEM_CON_RESERVAS_ACTIVAS` | 409 | Ítem referenciado en reservas activas |
| `RESERVA_NO_ENCONTRADA` | 404 | Reserva inexistente |
| `RESERVA_YA_PAGADA` | 422 | Reserva ya tiene venta asociada |
| `TRANSICION_INVALIDA` | 422 | Cambio de estado no permitido |
| `TRANSICION_COCINA_INVALIDA` | 422 | Cambio de estadoCocina no permitido |
| `ROL_SIN_PERMISO` | 403 | Rol no puede realizar esta transición |
| `CAJA_NO_ABIERTA` | 422 | No hay apertura de caja activa para el tenant |
| `PLATAFORMA_NO_CONFIGURADA` | 422 | Token RRSS no configurado |
| `PUBLICACION_YA_PROCESADA` | 422 | No se puede cancelar: ya publicada o en proceso |
| `FECHA_EN_PASADO` | 400 | Fecha programada ya pasó |
| `HORA_FUERA_DE_SERVICIO` | 422 | Hora de llegada fuera de franjas activas |
