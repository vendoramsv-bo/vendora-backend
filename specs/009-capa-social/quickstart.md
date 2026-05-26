# Quickstart: Capa Social — Escenarios de Integración

**Feature**: 009-capa-social  
**Date**: 2026-05-25

---

## Escenario 1 — Reaccionar a un producto y verlo en tiempo real

**Precondiciones**: Tenant "mi-tienda" con `esTienda=true`. Producto `prod-123` publicado. Dos usuarios autenticados: A (en la página del producto) y B (quien reaccionará).

```
1. Usuario A se conecta a Socket.IO y se une a sala "tenant:{tenantId}:producto:{prod-123}"

2. Usuario B: POST /api/social/productos/prod-123/reaccionar
   Body: { emoji: "❤️" }
   → Response 200: { id, emoji: "❤️", userId: B, productoId: "prod-123", createdAt }

3. Socket.IO emite "social:reaccion" a sala "tenant:{tenantId}:producto:{prod-123}"
   Payload: { elementoTipo: "PRODUCTO", elementoId: "prod-123", emoji: "❤️", removed: false, ... }

4. Usuario A recibe el evento en tiempo real sin recargar la página.

5. GET /api/public/social/mi-tienda/productos/prod-123/reacciones
   → Response: { data: [{ emoji: "❤️", count: 1 }], meta: { total: 1 } }
```

---

## Escenario 2 — Comentar y responder en un producto

**Precondiciones**: Mismo setup que Escenario 1.

```
1. Usuario A: POST /api/social/productos/prod-123/comentarios
   Body: { contenido: "Excelente producto, lo recomiendo." }
   → Response 201: { id: "com-456", contenido, userId: A, padreId: null, ... }

2. Socket.IO emite "social:comentario" a sala del producto y sala del tenant.

3. Usuario B ve el comentario en tiempo real.

4. Usuario B: POST /api/social/productos/prod-123/comentarios
   Body: { contenido: "¿Está disponible en azul?", padreId: "com-456" }
   → Response 201: { id: "com-789", padreId: "com-456", ... }

5. GET /api/public/social/mi-tienda/productos/prod-123/comentarios?soloRaiz=true
   → Devuelve com-456 con com-789 anidado.

6. Usuario B intenta responder a com-789 (ya es una respuesta):
   POST /api/social/productos/prod-123/comentarios
   Body: { contenido: "...", padreId: "com-789" }
   → Response 422: { error: "COMENTARIO_ES_RESPUESTA" }
```

---

## Escenario 3 — Valorar un producto (upsert)

**Precondiciones**: Usuario autenticado. Producto activo.

```
1. Usuario: POST /api/social/productos/prod-123/valorar
   Body: { puntuacion: 4, resena: "Muy buena calidad." }
   → Response 200: ProductoValoracion (nueva)

2. Usuario cambia su opinión:
   POST /api/social/productos/prod-123/valorar
   Body: { puntuacion: 5, resena: "Superó mis expectativas." }
   → Response 200: ProductoValoracion (actualizada, misma fila)

3. GET /api/public/social/mi-tienda/productos/prod-123/valoraciones
   → meta.promedio = 5.0 (solo hay una valoración del usuario)
```

---

## Escenario 4 — Seguir y dejar de seguir una tienda

**Precondiciones**: Tenant "mi-tienda" con `esTienda=true`.

```
1. Usuario A: POST /api/social/tiendas/mi-tienda/seguir
   → Response 200: { siguiendo: true }

2. GET /api/public/social/mi-tienda/seguidores/count
   → Response 200: { count: 1 }

3. Usuario A: POST /api/social/tiendas/mi-tienda/seguir (toggle)
   → Response 200: { siguiendo: false }

4. GET /api/public/social/mi-tienda/seguidores/count
   → Response 200: { count: 0 }
```

---

## Escenario 5 — Crear y publicar una publicación del tenant

**Precondiciones**: Usuario autenticado con rol PROPIETARIO del tenant.

```
1. PROPIETARIO: POST /api/social/publicaciones
   (La sesión activeOrganizationId = tenantId)
   Body: {
     titulo: "Oferta de verano",
     contenido: "30% en toda la tienda este fin de semana.",
     tipo: "MIXTO",
     etiquetas: ["oferta", "verano"],
     medios: [{ tipo: "IMAGEN", url: "https://cdn.example.com/img.jpg", orden: 0 }]
   }
   → Response 201: Publicacion { id: "pub-111", estado: "BORRADOR", ... }

2. PROPIETARIO: PATCH /api/social/publicaciones/pub-111/estado
   Body: { estado: "PUBLICADO" }
   → Response 200: Publicacion { estado: "PUBLICADO", publicadoEn: "2026-05-25T..." }

3. Socket.IO emite "social:publicacion-nueva" a sala "tenant:{tenantId}"
   Payload: { tenantId, publicacionId: "pub-111", titulo: "Oferta de verano", ... }

4. GET /api/public/social/mi-tienda/publicaciones
   → Devuelve pub-111 en la lista pública.

5. Usuario no autenticado: GET /api/public/social/mi-tienda/publicaciones/pub-111
   → Devuelve la publicación con medios y conteos de reacciones.
```

---

## Escenario 6 — Moderar (eliminar) un comentario inapropiado

**Precondiciones**: Hay un comentario `com-999` en la tienda con dos respuestas.

```
1. ADMIN del tenant: DELETE /api/social/comentarios/tienda/com-999
   (La sesión tiene activeOrganizationRole = "ADMIN" en el tenant que posee la tienda)
   → Response 200: { deleted: true }
   
   Comportamiento interno:
   - deleteMany({ where: { padreId: "com-999" } }) → elimina 2 respuestas
   - delete({ where: { id: "com-999" } }) → elimina el padre

2. GET /api/public/social/mi-tienda/comentarios
   → com-999 y sus respuestas ya no aparecen.
```

---

## Escenario 7 — Compartir una publicación en WhatsApp

```
1. Usuario (autenticado o no): hace clic en "Compartir" en pub-111.
   El frontend genera el share URL: https://wa.me/?text=url_de_la_publicacion

2. Si el usuario está autenticado, también registra el evento:
   POST /api/social/publicaciones/pub-111/compartir
   Body: { plataforma: "WHATSAPP" }
   → Response 201: { id, publicacionId: "pub-111", plataforma: "WHATSAPP", ... }

3. El staff puede ver métricas de compartición en el detalle de la publicación.
```

---

## Escenario 8 — Guard: ENCARGADO intenta crear publicación

```
1. Usuario con rol ENCARGADO: POST /api/social/publicaciones
   Body: { titulo: "Nueva oferta", contenido: "...", tipo: "TEXTO" }
   → Response 403: { error: "SOLO_PROPIETARIO_ADMIN", message: "..." }
```

---

## Escenario 9 — Tienda no activa (esTienda = false)

```
1. Tenant "mi-restaurante" tiene esTienda=false y esRestaurante=true.

2. Usuario: POST /api/social/tiendas/mi-restaurante/reaccionar
   Body: { tipo: "ME_GUSTA" }
   → Response 404: { error: "TIENDA_NO_ENCONTRADA" }
   
   (Las interacciones sobre el restaurante como vitrina no están disponibles en v1)
```
