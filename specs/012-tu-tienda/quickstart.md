# Quickstart / Test Scenarios: TuTienda

## Escenario 1: Activar perfil de tienda y aparecer en el directorio

```
DADO   un tenant "comercio-test" con esTienda=false
CUANDO el propietario hace PATCH /api/tenant/tienda/activar
ENTONCES:
  - Tenant.esTienda = true
  - Se crea Tienda (si no existía) con Configuracion defaults
  - GET /api/public/tiendas?busqueda=comercio-test devuelve el comercio
  - GET /api/public/tiendas/:slug retorna el perfil completo
  - Socket.IO emite tienda:configuracion:actualizada al room tenant:{id}
```

## Escenario 2: Desactivar tienda sin afectar operación interna

```
DADO   un tenant "comercio-test" con esTienda=true con ventas y catálogo activos
CUANDO el propietario hace PATCH /api/tenant/tienda/desactivar
ENTONCES:
  - Tenant.esTienda = false
  - GET /api/public/tiendas/:slug devuelve 404
  - GET /api/public/tiendas no incluye el comercio
  - Las ventas, catálogo e inventario internos siguen funcionando
```

## Escenario 3: Configurar tema visual y layout del POS

```
DADO   una tienda activa
CUANDO el propietario hace PATCH /api/tenant/tienda/configuracion
  { "tema": "blue", "tipoDespliegueVentas": "BARRA_SUPERIOR" }
ENTONCES:
  - Configuracion.tema = "blue"
  - Configuracion.tipoDespliegueVentas = BARRA_SUPERIOR
  - GET /api/public/tiendas/:slug refleja el nuevo tema
  - Socket.IO emite tienda:configuracion:actualizada
```

## Escenario 4: Gestionar productos destacados (max 20)

```
DADO   una tienda activa con un producto activo y visible públicamente
CUANDO el ADMIN hace POST /api/tenant/tienda/destacados { "productoId": "p1", "orden": 0 }
ENTONCES:
  - Se crea ProductoDestacado
  - GET /api/public/tiendas/:slug incluye p1 en productosDestacados
  - Socket.IO emite tienda:destacados:actualizados

CUANDO se intenta agregar un producto 21 (ya hay 20)
ENTONCES 422 ProductoDestacadoLimiteError

CUANDO se intenta agregar un producto inactivo
ENTONCES 422 ProductoNoVisibleError
```

## Escenario 5: Búsqueda por cercanía en el directorio

```
DADO   tres tiendas activas con localizaciones en distintas coordenadas
CUANDO un consumidor (sin auth) hace
  GET /api/public/tiendas?lat=-34.61&lng=-58.37&ordenarPor=distancia&orden=asc
ENTONCES:
  - Devuelve tiendas ordenadas por distancia ascendente
  - Cada resultado incluye distanciaKm
  - Respuesta incluye meta: { total, page, limit, totalPaginas, hayPaginaSiguiente }
```

## Escenario 6: Interacciones sociales de un consumidor

```
DADO   una tienda activa y un usuario autenticado sin membresía
CUANDO el usuario hace POST /api/public/tiendas/:slug/valorar { "puntuacion": 5, "resena": "Excelente" }
ENTONCES:
  - Se crea TiendaValoracion
  - Socket.IO emite tienda:nueva:valoracion al room tenant:{id}
  - El propietario recibe notificación en tiempo real

SI el mismo usuario vuelve a valorar la misma tienda:
  - La valoración anterior se REEMPLAZA (@@unique tiendaId+userId)

CUANDO el usuario intenta valorar sin auth:
  - 401 Unauthorized
```

## Escenario 7: Preguntas — visibilidad y ocultación

```
DADO   una tienda activa y un usuario autenticado
CUANDO el usuario hace POST /api/public/tiendas/:slug/preguntas { "pregunta": "¿Tienen delivery?" }
ENTONCES:
  - TiendaPregunta.estado = ACTIVO (visible públicamente de inmediato)
  - GET /api/public/tiendas/:slug/preguntas incluye la pregunta

CUANDO el propietario hace PATCH /api/tenant/tienda/preguntas/:id/ocultar
ENTONCES:
  - TiendaPregunta.estado = INACTIVO
  - GET /api/public/tiendas/:slug/preguntas NO incluye la pregunta

CUANDO el propietario hace PATCH /api/tenant/tienda/preguntas/:id/mostrar
ENTONCES:
  - TiendaPregunta.estado = ACTIVO
  - La pregunta vuelve a ser visible
```

## Escenario 8: Publicaciones del comercio a seguidores

```
DADO   una tienda activa con un seguidor conectado vía Socket.IO
CUANDO el PROPIETARIO hace POST /api/tenant/publicaciones
  { "contenido": "Nueva oferta hoy!", "tipo": "TEXTO" }
ENTONCES:
  - Publicacion creada con estado PUBLICADO
  - GET /api/public/tiendas/:slug/publicaciones incluye la nueva publicación
  - El seguidor recibe update en tiempo real

CUANDO un EMPLEADO intenta hacer POST /api/tenant/publicaciones
ENTONCES:
  - 403 Forbidden (solo PROPIETARIO y ADMIN pueden publicar)
```

## Escenario 9: Privacidad — datos internos nunca expuestos

```
DADO   una tienda con esTienda=true y ventas registradas
CUANDO cualquier cliente hace GET /api/public/tiendas/:slug
ENTONCES:
  - La respuesta NO contiene ventas, montos, inventario, caja, movimientos
  - Solo contiene: nombre, descripción, logo, imágenes, ubicación, catálogo visible
```

## Escenario 10: Comentarios en árbol recursivo

```
DADO   una tienda activa
CUANDO el consumidor A comenta: POST /tiendas/:slug/comentarios { "contenido": "Muy buena atención" }
  → comentarioId = "c1"
CUANDO el propietario responde: POST /tiendas/:slug/comentarios { "contenido": "Gracias!", "padreId": "c1" }
  → comentarioId = "c2"
CUANDO el consumidor B responde a c2: POST con { "padreId": "c2" }
ENTONCES:
  - Árbol: c1 → c2 → c3 (sin límite de profundidad)
  - GET /tiendas/:slug/comentarios devuelve solo raíces (sin padreId)
  - GET /tiendas/:slug/comentarios?padreId=c1 devuelve hijos directos de c1
  - Socket.IO emite tienda:nuevo:comentario al room tenant:{id}
```
