# REST API Contract: Catálogo Comercial

**Base path**: `/api/catalogo`
**Auth**: Todos los endpoints requieren `requireAuth + requireTenantActivo`.
**Escritura**: Los endpoints de mutación (POST/PUT/PATCH/DELETE) requieren además `requireRol(["PROPIETARIO", "ADMIN"])`.

---

## Clasificadores globales (solo lectura)

### GET /cla-actividades
Lista todos los clasificadores de actividad económica disponibles en el sistema.

**Response 200**:
```json
{
  "data": [
    { "id": "cla_abc", "codigo": "RETAIL", "nombre": "Comercio al por menor", "imagenUrl": null }
  ]
}
```

### GET /cla-unidades
Lista todos los clasificadores de unidad de medida disponibles en el sistema.

**Response 200**:
```json
{
  "data": [
    { "id": "cla_u1", "unidad": "Kilogramo", "sigla": "kg", "descripcion": "Unidad de masa" }
  ]
}
```

---

## Actividades Económicas del Tenant

### GET /actividades
Lista las actividades económicas activadas por el tenant.

**Response 200**:
```json
{
  "data": [
    {
      "id": "act_1",
      "claActividadId": "cla_abc",
      "nombre": "Comercio al por menor",
      "estado": "ACTIVO",
      "createdAt": "2026-05-22T00:00:00Z"
    }
  ]
}
```

### POST /actividades
Activa una actividad económica para el tenant.

**Body**:
```json
{ "claActividadId": "cla_abc" }
```

**Response 201**:
```json
{
  "id": "act_1",
  "claActividadId": "cla_abc",
  "nombre": "Comercio al por menor",
  "estado": "ACTIVO",
  "createdAt": "2026-05-22T00:00:00Z"
}
```

**Errores**:
- `409 { "error": "ACTIVIDAD_DUPLICADA" }` — ya activada para este tenant

### DELETE /actividades/:id
Desactiva una actividad económica del tenant (cambia estado a INACTIVO).

**Response 200**: `{ "ok": true }`

**Errores**:
- `404 { "error": "ACTIVIDAD_NO_ENCONTRADA" }`
- `422 { "error": "ACTIVIDAD_EN_USO" }` — tiene categorías o productos activos

---

## Unidades de Medida del Tenant

### GET /unidades
Lista las unidades de medida del tenant.

**Query params**: `estado` (ACTIVO | INACTIVO), `search`

**Response 200**:
```json
{
  "data": [
    {
      "id": "um_1",
      "unidad": "Kilogramo",
      "sigla": "kg",
      "descripcion": "Unidad de masa",
      "claUnidadId": null,
      "estado": "ACTIVO"
    }
  ]
}
```

### POST /unidades
Crea una unidad de medida para el tenant.

**Body**:
```json
{
  "unidad": "Kilogramo",
  "sigla": "kg",
  "descripcion": "Unidad de masa",
  "claUnidadId": null
}
```

**Response 201**: objeto `UnidadMedida`

**Errores**:
- `409 { "error": "UNIDAD_DUPLICADA" }` — nombre ya existe en este tenant

### PUT /unidades/:id
Actualiza una unidad de medida.

**Body**: Partial de campos (unidad, sigla, descripcion, estado)

**Response 200**: objeto `UnidadMedida` actualizado

**Errores**:
- `404 { "error": "UNIDAD_NO_ENCONTRADA" }`

---

## Categorías

### GET /categorias
Lista las categorías del tenant (lista plana con `padreId`).

**Query params**: `actividadId` (filtro), `estado` (ACTIVO | INACTIVO | todos), `search` (búsqueda por nombre)

**Response 200**:
```json
{
  "data": [
    {
      "id": "cat_1",
      "actividadId": "act_1",
      "nombre": "Electrónica",
      "descripcion": null,
      "imagenUrl": null,
      "padreId": null,
      "nivel": 1,
      "estado": "ACTIVO",
      "createdAt": "2026-05-22T00:00:00Z",
      "createdById": "usr_1"
    }
  ]
}
```

### POST /categorias
Crea una categoría para el tenant.

**Body**:
```json
{
  "actividadId": "act_1",
  "nombre": "Electrónica",
  "descripcion": "Productos electrónicos",
  "imagenUrl": "https://...",
  "padreId": null
}
```

**Response 201**: objeto `Categoria`

**Errores**:
- `409 { "error": "CATEGORIA_NOMBRE_DUPLICADO" }` — nombre ya existe en (tenant, actividad)
- `404 { "error": "ACTIVIDAD_NO_ENCONTRADA" }`
- `404 { "error": "CATEGORIA_PADRE_NO_ENCONTRADA" }` — si padreId no existe

### GET /categorias/:id
Obtiene una categoría con sus hijos directos.

**Response 200**: objeto `Categoria` con campo `hijos: Categoria[]`

**Errores**:
- `404 { "error": "CATEGORIA_NO_ENCONTRADA" }`

### PUT /categorias/:id
Actualiza una categoría.

**Body**: Partial (nombre, descripcion, imagenUrl)

**Response 200**: objeto `Categoria` actualizado

**Errores**:
- `404 { "error": "CATEGORIA_NO_ENCONTRADA" }`
- `409 { "error": "CATEGORIA_NOMBRE_DUPLICADO" }`

### PATCH /categorias/:id/estado
Cambia el estado de una categoría.

**Body**: `{ "estado": "INACTIVO" }`

**Response 200**: objeto `Categoria` actualizado

**Errores**:
- `404 { "error": "CATEGORIA_NO_ENCONTRADA" }`

---

## Productos

### GET /productos
Lista productos del tenant con soporte completo de parámetros (makeQueryParamsSchema).

**Query params**:
- `take` (default 20, max 100)
- `skip` / `cursor`
- `search` — busca en nombre y descripción
- `filter[field]` / `filter[op]` / `filter[value]` — filtra por estado, categoriaId, tipoProducto
- `orderBy[field]` / `orderBy[order]` — ordena por nombre, precio, cantidadStock, createdAt

**Response 200**:
```json
{
  "data": [
    {
      "id": "prod_1",
      "categoriaId": "cat_1",
      "actividadId": "act_1",
      "codigo": "ELEC-001",
      "nombre": "Televisor 55\"",
      "descripcion": "Smart TV 4K",
      "imagenUrl": "https://...",
      "tipoProducto": "COMERCIALIZACION",
      "precio": "599.99",
      "cantidadStock": 10,
      "stockMinimo": 2,
      "unidadId": "um_1",
      "estado": "ACTIVO",
      "createdAt": "2026-05-22T00:00:00Z",
      "createdById": "usr_1",
      "updatedById": "usr_1"
    }
  ],
  "meta": { "take": 20, "total": 150, "hasMore": true, "nextCursor": "prod_20" }
}
```

### POST /productos
Crea un producto en el catálogo.

**Body**:
```json
{
  "actividadId": "act_1",
  "categoriaId": "cat_1",
  "unidadId": "um_1",
  "codigo": "ELEC-001",
  "nombre": "Televisor 55\"",
  "descripcion": "Smart TV 4K",
  "imagenUrl": "https://...",
  "tipoProducto": "COMERCIALIZACION",
  "precio": 599.99,
  "cantidadStock": 10,
  "stockMinimo": 2
}
```

**Response 201**: objeto `Producto`

**Errores**:
- `409 { "error": "PRODUCTO_CODIGO_DUPLICADO" }`
- `409 { "error": "PRODUCTO_NOMBRE_DUPLICADO" }`
- `404 { "error": "CATEGORIA_NO_ENCONTRADA" }`
- `404 { "error": "UNIDAD_NO_ENCONTRADA" }`

### GET /productos/:id
Obtiene un producto completo con variantes, opciones y ofertas vigentes.

**Response 200**:
```json
{
  "id": "prod_1",
  "codigo": "ELEC-001",
  "nombre": "Televisor 55\"",
  "precio": "599.99",
  "tipoProducto": "COMERCIALIZACION",
  "estado": "ACTIVO",
  "atributos": [
    {
      "id": "attr_1",
      "nombre": "Color",
      "tipo": "COLOR",
      "valores": [
        { "id": "val_1", "valor": "Negro", "hexColor": "#000000" }
      ]
    }
  ],
  "variantes": [
    {
      "id": "var_1",
      "sku": "ELEC-001-NGR",
      "precio": "589.99",
      "cantidadStock": 5,
      "estado": "ACTIVO",
      "atributos": [{ "atributoValorId": "val_1", "valor": "Negro" }]
    }
  ],
  "opciones": [
    { "id": "op_1", "nombre": "Garantía extendida", "precio": "49.99" }
  ],
  "ofertasVigentes": [
    { "id": "of_1", "precioOferta": "549.99", "fechaInicio": "2026-05-01T00:00:00Z", "fechaFin": "2026-05-31T23:59:59Z" }
  ],
  "preciosVolumen": [
    { "id": "pv_1", "cantidad": 5, "precio": "579.99", "etiqueta": "Precio por mayor" }
  ]
}
```

**Errores**:
- `404 { "error": "PRODUCTO_NO_ENCONTRADO" }`

### PUT /productos/:id
Actualiza un producto. Si cambia `precio`, se registra automáticamente en historial.

**Body**: Partial (nombre, descripcion, imagenUrl, precio, cantidadStock, stockMinimo, tipoDescuento, …)

**Response 200**: objeto `Producto` actualizado

**Errores**:
- `404 { "error": "PRODUCTO_NO_ENCONTRADO" }`
- `409 { "error": "PRODUCTO_CODIGO_DUPLICADO" }` / `PRODUCTO_NOMBRE_DUPLICADO`

### PATCH /productos/:id/estado
Cambia el estado de un producto.

**Body**: `{ "estado": "INACTIVO" | "ACTIVO" | "ELIMINADO" }`

**Response 200**: objeto `Producto` actualizado

---

## Atributos y valores de variante

### GET /productos/:id/atributos
Lista los atributos del producto con sus valores.

**Response 200**: `{ "data": [ProductoAtributo con valores[]] }`

### POST /productos/:id/atributos
Agrega un atributo al producto.

**Body**: `{ "nombre": "Talla", "tipo": "TEXTO", "orden": 0 }`

**Response 201**: objeto `ProductoAtributo`

**Errores**:
- `409 { "error": "ATRIBUTO_NOMBRE_DUPLICADO" }`

### POST /productos/:id/atributos/:attrId/valores
Agrega un valor a un atributo.

**Body**: `{ "valor": "M", "hexColor": null, "imagenUrl": null, "orden": 0 }`

**Response 201**: objeto `ProductoAtributoValor`

**Errores**:
- `409 { "error": "ATRIBUTO_VALOR_DUPLICADO" }`
- `404 { "error": "ATRIBUTO_NO_ENCONTRADO" }`

---

## Variantes

### GET /productos/:id/variantes
Lista las variantes del producto.

**Response 200**: `{ "data": [ProductoVariante con atributos[]] }`

### POST /productos/:id/variantes
Crea una variante del producto.

**Body**:
```json
{
  "sku": "ELEC-001-NGR",
  "precio": 589.99,
  "cantidadStock": 5,
  "stockMinimo": 1,
  "imagenUrl": null,
  "atributoValorIds": ["val_1"]
}
```

**Response 201**: objeto `ProductoVariante` con `atributos[]`

**Errores**:
- `409 { "error": "VARIANTE_SKU_DUPLICADO" }`
- `409 { "error": "VARIANTE_ATRIBUTOS_DUPLICADOS" }` — misma combinación ya existe

### PUT /productos/:id/variantes/:varId
Actualiza una variante.

**Body**: Partial (sku, precio, cantidadStock, stockMinimo, imagenUrl)

**Response 200**: objeto `ProductoVariante` actualizado

**Errores**:
- `404 { "error": "VARIANTE_NO_ENCONTRADA" }`

### PATCH /productos/:id/variantes/:varId/estado
Cambia el estado de una variante.

**Body**: `{ "estado": "INACTIVO" | "ACTIVO" }`

**Response 200**: objeto `ProductoVariante` actualizado

---

## Precios por Volumen

### GET /productos/:id/precios-volumen
Lista los precios por volumen del producto (activos).

**Response 200**: `{ "data": [ProductoPrecioVolumen[]] }`

### POST /productos/:id/precios-volumen
Agrega un precio por volumen.

**Body**:
```json
{
  "etiqueta": "Precio por mayor",
  "cantidad": 5,
  "precio": 579.99,
  "varianteId": null
}
```

**Response 201**: objeto `ProductoPrecioVolumen`

**Errores**:
- `409 { "error": "PRECIO_VOLUMEN_CANTIDAD_DUPLICADA" }` — ya existe regla para esa cantidad (y variante)

### DELETE /productos/:id/precios-volumen/:pvId
Elimina (desactiva) un precio por volumen.

**Response 200**: `{ "ok": true }`

---

## Opciones adicionales

### GET /productos/:id/opciones
Lista las opciones del producto.

**Response 200**: `{ "data": [ProductoOpciones[]] }`

### POST /productos/:id/opciones
Agrega una opción al producto.

**Body**: `{ "nombre": "Garantía extendida", "descripcion": null, "precio": 49.99 }`

**Response 201**: objeto `ProductoOpciones`

**Errores**:
- `409 { "error": "OPCION_NOMBRE_DUPLICADA" }`

### PUT /productos/:id/opciones/:opId
Actualiza una opción.

**Body**: Partial (nombre, descripcion, precio, estado)

**Response 200**: objeto `ProductoOpciones` actualizado

**Errores**:
- `404 { "error": "OPCION_NO_ENCONTRADA" }`

---

## Ofertas

### GET /productos/:id/ofertas
Lista las ofertas del producto. Por defecto retorna solo las vigentes.

**Query params**: `soloVigentes` (true | false, default true), `varianteId` (filtro opcional)

**Response 200**: `{ "data": [ProductoOfertas[]] }`

### POST /productos/:id/ofertas
Crea una oferta para el producto.

**Body**:
```json
{
  "varianteId": null,
  "fechaInicio": "2026-06-01T00:00:00Z",
  "fechaFin": "2026-06-30T23:59:59Z",
  "precioOferta": 549.99,
  "descuento": 0
}
```

**Response 201**: objeto `ProductoOfertas`

**Errores**:
- `409 { "error": "OFERTA_SOLAPADA" }` — ya existe oferta para mismas fechas y variante

### PUT /productos/:id/ofertas/:ofId
Actualiza una oferta.

**Body**: Partial (fechaInicio, fechaFin, precioOferta, descuento, estado)

**Response 200**: objeto `ProductoOfertas` actualizado

**Errores**:
- `404 { "error": "OFERTA_NO_ENCONTRADA" }`

---

## Historial de precios

### GET /productos/:id/precio-historico
Lista el historial de cambios de precio del producto (más reciente primero).

**Query params**: `take` (default 20, max 100), `skip`

**Response 200**:
```json
{
  "data": [
    {
      "id": "ph_1",
      "precioAnterior": "499.99",
      "precioNuevo": "599.99",
      "createdAt": "2026-05-22T10:00:00Z"
    }
  ],
  "meta": { "take": 20, "total": 3, "hasMore": false }
}
```
