# Quickstart: Catálogo Comercial

Escenarios de integración para validar manualmente cada User Story del catálogo. Requiere `pnpm dev` corriendo con PostgreSQL y Redis activos.

**Base URL**: `http://localhost:3000`
**Auth**: Todas las solicitudes requieren header `Authorization: Bearer <token>` con un tenant activo en sesión.

---

## Escenario 1 — Configuración inicial (prerequisitos)

Antes de crear categorías o productos, el tenant necesita activar una actividad económica y definir al menos una unidad de medida.

### 1.1 — Listar actividades económicas disponibles (globales)
```http
GET /api/catalogo/cla-actividades
```
Verificar: retorna lista de clasificadores globales del sistema.

### 1.2 — Activar una actividad económica para el tenant
```http
POST /api/catalogo/actividades
Content-Type: application/json

{ "claActividadId": "<id del clasificador>" }
```
Verificar: responde 201 con `{ "id": "act_...", "nombre": "...", "estado": "ACTIVO" }`.

### 1.3 — Crear una unidad de medida
```http
POST /api/catalogo/unidades
Content-Type: application/json

{ "unidad": "Unidad", "sigla": "und", "descripcion": "Unidad genérica" }
```
Verificar: responde 201 con la unidad creada.

---

## Escenario 2 — Gestión de categorías jerárquicas (US1)

### 2.1 — Crear categoría raíz
```http
POST /api/catalogo/categorias
Content-Type: application/json

{
  "actividadId": "<id de la actividad del tenant>",
  "nombre": "Electrónica",
  "descripcion": "Productos electrónicos",
  "padreId": null
}
```
Verificar: responde 201 con `{ "id": "cat_...", "nivel": 1, "padreId": null }`.

### 2.2 — Crear subcategoría
```http
POST /api/catalogo/categorias
Content-Type: application/json

{
  "actividadId": "<actividadId>",
  "nombre": "Televisores",
  "padreId": "<id de Electrónica>"
}
```
Verificar: responde 201 con `{ "nivel": 2, "padreId": "<id de Electrónica>" }`.

### 2.3 — Listar categorías (lista plana)
```http
GET /api/catalogo/categorias?actividadId=<actividadId>
```
Verificar: retorna ambas categorías con sus `padreId` correctos.

### 2.4 — Intentar nombre duplicado (mismo padre y actividad)
```http
POST /api/catalogo/categorias
Content-Type: application/json

{ "actividadId": "<actividadId>", "nombre": "Electrónica", "padreId": null }
```
Verificar: responde 409 con `{ "error": "CATEGORIA_NOMBRE_DUPLICADO" }`.

### 2.5 — Desactivar categoría hoja
```http
PATCH /api/catalogo/categorias/<id de Televisores>/estado
Content-Type: application/json

{ "estado": "INACTIVO" }
```
Verificar: categoría pasa a INACTIVO. Verificar que `GET /categorias?estado=ACTIVO` no la incluye.

---

## Escenario 3 — Gestión de productos (US2)

### 3.1 — Crear producto básico
```http
POST /api/catalogo/productos
Content-Type: application/json

{
  "actividadId": "<actividadId>",
  "categoriaId": "<id de Electrónica>",
  "unidadId": "<id de Unidad>",
  "codigo": "ELEC-001",
  "nombre": "Televisor 55\"",
  "descripcion": "Smart TV 4K HDR",
  "tipoProducto": "COMERCIALIZACION",
  "precio": 599.99,
  "cantidadStock": 10,
  "stockMinimo": 2
}
```
Verificar: responde 201 con producto completo, incluyendo `createdById`.

### 3.2 — Listar productos con filtros
```http
GET /api/catalogo/productos?filter[field]=tipoProducto&filter[op]=equals&filter[value]=COMERCIALIZACION&orderBy[field]=precio&orderBy[order]=asc
```
Verificar: retorna productos filtrados y ordenados, con `meta.total` y `meta.hasMore`.

### 3.3 — Búsqueda de texto libre
```http
GET /api/catalogo/productos?search=Smart
```
Verificar: retorna productos cuyo nombre o descripción contiene "Smart".

### 3.4 — Intentar código duplicado
```http
POST /api/catalogo/productos
Content-Type: application/json

{ ...mismos datos con codigo "ELEC-001"... }
```
Verificar: responde 409 con `{ "error": "PRODUCTO_CODIGO_DUPLICADO" }`.

### 3.5 — Actualizar producto
```http
PUT /api/catalogo/productos/<productoId>
Content-Type: application/json

{ "descripcion": "Smart TV 4K HDR con Google TV" }
```
Verificar: responde 200 con descripción actualizada y `updatedById` correcto.

---

## Escenario 4 — Variantes y atributos (US3)

### 4.1 — Crear atributo "Talla"
```http
POST /api/catalogo/productos/<productoId>/atributos
Content-Type: application/json

{ "nombre": "Talla", "tipo": "TEXTO", "orden": 0 }
```
Verificar: responde 201 con `{ "id": "attr_...", "nombre": "Talla" }`.

### 4.2 — Agregar valores al atributo
```http
POST /api/catalogo/productos/<productoId>/atributos/<attrId>/valores
Content-Type: application/json

{ "valor": "S", "orden": 0 }
```
Repetir para "M" y "L".

### 4.3 — Crear variante
```http
POST /api/catalogo/productos/<productoId>/variantes
Content-Type: application/json

{
  "sku": "PROD-S",
  "precio": 29.99,
  "cantidadStock": 15,
  "stockMinimo": 3,
  "atributoValorIds": ["<id del valor S>"]
}
```
Verificar: responde 201 con `{ "id": "var_...", "sku": "PROD-S", "atributos": [...] }`.

### 4.4 — Intentar variante duplicada (misma combinación de atributos)
```http
POST /api/catalogo/productos/<productoId>/variantes
Content-Type: application/json

{ "sku": "PROD-S-2", "atributoValorIds": ["<id del valor S>"] }
```
Verificar: responde 409 con `{ "error": "VARIANTE_ATRIBUTOS_DUPLICADOS" }`.

### 4.5 — Actualizar stock de una variante
```http
PUT /api/catalogo/productos/<productoId>/variantes/<varId>
Content-Type: application/json

{ "cantidadStock": 20 }
```
Verificar: solo esa variante cambia; las demás mantienen su stock.

---

## Escenario 5 — Precios, opciones y ofertas (US4)

### 5.1 — Agregar precio por volumen
```http
POST /api/catalogo/productos/<productoId>/precios-volumen
Content-Type: application/json

{ "etiqueta": "Precio mayorista", "cantidad": 5, "precio": 539.99 }
```
Verificar: responde 201. `GET /productos/<id>` muestra `preciosVolumen` con esta regla.

### 5.2 — Agregar opción adicional
```http
POST /api/catalogo/productos/<productoId>/opciones
Content-Type: application/json

{ "nombre": "Garantía extendida 2 años", "precio": 49.99 }
```
Verificar: responde 201. `GET /productos/<id>` muestra `opciones` con esta entrada.

### 5.3 — Crear oferta vigente
```http
POST /api/catalogo/productos/<productoId>/ofertas
Content-Type: application/json

{
  "fechaInicio": "2026-05-22T00:00:00Z",
  "fechaFin": "2026-06-30T23:59:59Z",
  "precioOferta": 549.99
}
```
Verificar: responde 201. `GET /productos/<id>` muestra `ofertasVigentes` con esta oferta.

### 5.4 — Crear oferta expirada
```http
POST /api/catalogo/productos/<productoId>/ofertas
Content-Type: application/json

{
  "fechaInicio": "2026-01-01T00:00:00Z",
  "fechaFin": "2026-01-31T23:59:59Z",
  "precioOferta": 499.99
}
```
Verificar: `GET /productos/<id>` NO muestra esta oferta en `ofertasVigentes`.

### 5.5 — Cambiar precio y verificar historial
```http
PUT /api/catalogo/productos/<productoId>
Content-Type: application/json

{ "precio": 649.99 }
```
Luego:
```http
GET /api/catalogo/productos/<productoId>/precio-historico
```
Verificar: retorna al menos un registro con `precioAnterior: "599.99"` y `precioNuevo: "649.99"`.

---

## Escenario 6 — Actualizaciones en tiempo real (US5)

### Setup
Conectar dos clientes WebSocket al mismo tenant:
```js
const socket = io("http://localhost:3000", {
  auth: { token: "<jwt-token>" }
})
socket.on("catalogo:producto:creado", (data) => console.log("Nuevo producto:", data))
socket.on("catalogo:producto:actualizado", (data) => console.log("Producto actualizado:", data))
socket.on("catalogo:oferta:creada", (data) => console.log("Nueva oferta:", data))
```

### 6.1 — Crear producto y verificar evento
Desde cliente A: ejecutar POST /api/catalogo/productos.
**Verificar**: cliente B recibe `catalogo:producto:creado` con el payload del nuevo producto.

### 6.2 — Actualizar precio y verificar evento
Desde cliente A: ejecutar PUT /api/catalogo/productos/:id con nuevo precio.
**Verificar**: cliente B recibe `catalogo:producto:actualizado` con `{ productoId, precio }`.

### 6.3 — Aislamiento de tenant
Conectar cliente C con token de un tenant DIFERENTE.
Desde cliente A: crear producto.
**Verificar**: cliente C NO recibe el evento.

---

## Escenario 7 — Paginación por cursor

### 7.1 — Primera página
```http
GET /api/catalogo/productos?take=5&orderBy[field]=createdAt&orderBy[order]=desc
```
Guardar el `meta.nextCursor` de la respuesta.

### 7.2 — Página siguiente
```http
GET /api/catalogo/productos?take=5&cursor=<nextCursor>
```
Verificar: retorna los 5 productos siguientes sin repetir ni saltear ninguno del conjunto anterior.
