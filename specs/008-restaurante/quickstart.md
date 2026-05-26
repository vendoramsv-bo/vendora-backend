# Quickstart: Módulo de Restaurante

**Feature**: 008-restaurante  
**Date**: 2026-05-25

Escenarios de integración para desarrollo y QA. Verifican el golden path y los edge cases.

---

## Escenario 1 — Configuración inicial completa

```
1. ADMIN configura perfil:
   PUT /restaurante/perfil
   → capacidadMesas=20, duracionPromedioMinutos=60, servicios=["MESA","DELIVERY"]

2. ADMIN crea franja horaria:
   POST /restaurante/tiempos-comida
   → { nombre:"ALMUERZO", horaInicio:"12:00", horaFin:"15:00", orden:2 }

3. ADMIN crea menú:
   POST /restaurante/menus
   → { nombre:"Menú del lunes", tipo:"DIARIO", fechaInicio:"...", fechaFin:"..." }

4. ADMIN agrega 3 platos al menú:
   POST /restaurante/menus/:menuId/items ×3
   → con productoId del catálogo, tiempoComidaId y precio

5. ADMIN aprueba menú:
   PATCH /restaurante/menus/:menuId/estado { "estado":"APROBADO" }

6. ADMIN publica menú:
   PATCH /restaurante/menus/:menuId/estado { "estado":"PUBLICADO" }

7. Verificar visibilidad pública:
   GET /public/restaurante/:slug/menus?fecha=YYYY-MM-DD
   → devuelve el menú recién publicado con sus ítems
```

**Criterio de aceptación**: SC-001 — configuración completa en < 10 minutos

---

## Escenario 2 — Flujo completo de reserva (golden path)

```
1. Cliente crea reserva (pública, sin auth):
   POST /public/restaurante/:slug/reservas
   → clienteNombre="Ana López", fechaLlegada="2026-06-02T13:00:00Z",
     numeroComensales=2, items=[{menuItemId, cantidad:1, observacion:"sin cebolla"}]
   → Response: { codigo:"RST-20260602-0001", estado:"RESERVADA" }
   → Socket.IO emite "reserva:creada" a tenant:${tenantId}:restaurante

2. MESERO confirma llegada:
   PATCH /restaurante/reservas/:id/estado { "estado":"CONFIRMADA", "numeroMesa":"5" }
   → Socket.IO emite "reserva:actualizada"

3. MESERO envía a cocina:
   PATCH /restaurante/reservas/:id/estado { "estado":"EN_PREPARACION" }

4. CHEF actualiza estado del plato:
   PATCH /restaurante/cocina/items/:detalleId/estado { "estadoCocina":"EN_PREPARACION" }
   PATCH /restaurante/cocina/items/:detalleId/estado { "estadoCocina":"LISTO" }
   → Socket.IO emite "cocina:plato-actualizado"

5. MESERO marca plato como entregado:
   PATCH /restaurante/cocina/items/:detalleId/estado { "estadoCocina":"ENTREGADO" }
   → Si era el último ítem → reserva.estado cambia automáticamente a "LISTA"

6. CAJERO registra pago:
   POST /restaurante/reservas/:id/pagar { "cajaId":"...", "cajeroId":"..." }
   → Response: { reserva:{estado:"PAGADA"}, venta:{ventaId, numeroVenta} }
```

**Criterio de aceptación**: SC-002, SC-003, SC-005

---

## Escenario 3 — Panel de cocina en tiempo real

```
Precondición: 3 reservas en estado EN_PREPARACION con 2 ítems c/u

1. Abrir dos conexiones Socket.IO:
   - Conexión A: usuario CHEF → se une a tenant:${id}:cocina
   - Conexión B: usuario MESERO → se une a tenant:${id}:restaurante

2. CHEF actualiza ítem en Conexión A:
   PATCH /restaurante/cocina/items/:detalleId/estado { "estadoCocina":"LISTO" }

3. Verificar en Conexión B (MESERO):
   → Evento "cocina:plato-actualizado" recibido en < 2 s

4. MESERO marca entregado desde Conexión B:
   PATCH /restaurante/cocina/items/:detalleId/estado { "estadoCocina":"ENTREGADO" }
   → Si todos los ítems: "reserva:actualizada" con estado "LISTA"

5. GET /restaurante/cocina verifica orden por fechaLlegada:
   → reserva más antigua aparece primero
```

**Criterio de aceptación**: SC-003, SC-004

---

## Escenario 4 — Publicación automática en redes

```
1. ADMIN configura credenciales de Instagram:
   PUT /restaurante/perfil
   → configuracionRRSS.instagram: { habilitado:true, accessToken:"...", horaPublicacion:"10:00" }

2. ADMIN programa publicación:
   POST /restaurante/publicaciones
   → { menuId:"...", redSocial:"INSTAGRAM", fechaProgramada:"2026-06-02T10:00:00Z" }
   → Response: estado PROGRAMADA
   → Job BullMQ encolado con delay hasta las 10:00

3. Al llegar la hora:
   Worker ejecuta: genera PNG 1080×1080 → sube a R2 → llama Instagram Graph API
   → PublicacionMenuRRSS.estado cambia a PUBLICADA + urlPublicacion + urlImagenGenerada

4. ~1 hora después, job de métricas:
   → GET /v20/{mediaId}/insights
   → Actualiza alcance y reacciones en PublicacionMenuRRSS

5. Verificar historial:
   GET /restaurante/publicaciones
   → Muestra publicación con estado PUBLICADA, metrics.alcance > 0
```

**Criterio de aceptación**: SC-006

---

## Escenario 5 — Error: caja no abierta al pagar

```
Precondición: tenant sin AperturaCierreDeCaja activa

POST /restaurante/reservas/:id/pagar { "cajaId":"...", "cajeroId":"..." }
→ HTTP 422 { "code": "CAJA_NO_ABIERTA",
              "message": "No hay caja abierta. Abra una caja antes de registrar el pago." }
→ Reserva permanece en estado ENTREGADA (no cambia)
```

**Criterio de aceptación**: FR-015

---

## Escenario 6 — Guard de capacidad (tenant sin restaurante)

```
Tenant con esRestaurante = false:

GET /restaurante/perfil
→ HTTP 403 { "code": "CAPACIDAD_NO_ACTIVADA",
              "message": "Este tenant no tiene el módulo de restaurante activado." }
```

**Criterio de aceptación**: SC-008, FR-001

---

## Escenario 7 — Cliente ocasional sin datos de contacto

```
POST /public/restaurante/:slug/reservas
→ { clienteNombre:"Visitante", numeroComensales:1, items:[...] }
   (sin clienteEmail ni clienteTelefono)
→ HTTP 201 con codigo de reserva
   clienteId = null en la BD, clienteNombre = "Visitante"
```

**Criterio de aceptación**: FR-011b, Edge Case #6

---

## Escenario 8 — Publicación fallida con notificación

```
Worker intenta publicar → Instagram devuelve error 401 (token expirado)

→ PublicacionMenuRRSS.estado = FALLIDA
→ PublicacionMenuRRSS.errorMensaje = "OAuthException: token inválido"
→ Notificacion creada para el ADMIN con tipo "ERROR_PUBLICACION_RRSS"
→ GET /restaurante/publicaciones filtrando estado=FALLIDA muestra el registro
```

**Criterio de aceptación**: FR-024, SC-006
