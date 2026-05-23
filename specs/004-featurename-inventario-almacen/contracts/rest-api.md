# REST API Contract: Inventario y Almacén

**Base path**: `/api/almacen`
**Auth**: Todos los endpoints requieren `requireAuth + requireTenantActivo`
**Roles de escritura**: `requireRol(["PROPIETARIO", "ADMIN"])`
**Roles de lectura**: Cualquier miembro autenticado del tenant

---

## Inventario de Productos

### Stock de variante

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/variantes/:varianteId/stock` | lectura | Obtiene stock actual, mínimo y estado de inicialización |
| `POST` | `/variantes/:varianteId/inicializar` | escritura | Inicializa la variante en inventario |
| `GET` | `/variantes/:varianteId/movimientos` | lectura | Lista historial de movimientos de la variante |

#### `POST /variantes/:varianteId/inicializar`
```json
Request: {
  "stockInicial": 100,
  "stockMinimo": 10
}
Response 200: {
  "varianteId": "...",
  "cantidadStock": 100,
  "stockMinimo": 10,
  "inventarioActivado": true
}
Errors: 404 VarianteNoEncontrada, 409 VarianteYaInicializada
```

#### `GET /variantes/:varianteId/movimientos`
```
Query: take, skip, orderBy, order, filterField, filterOp, filterValue
Response 200: { data: MovimientoInventario[], meta: PaginationMeta }
```

---

### Ajustes de inventario

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/ajustes` | lectura | Lista ajustes del tenant (paginado) |
| `POST` | `/ajustes` | escritura | Crea y confirma un ajuste batch |
| `GET` | `/ajustes/:id` | lectura | Obtiene ajuste con sus detalles |

#### `POST /ajustes`
```json
Request: {
  "motivo": "Corrección fin de mes",
  "detalles": [
    { "productoId": "...", "varianteId": "...", "cantidadAjuste": -5 },
    { "productoId": "...", "varianteId": "...", "cantidadAjuste": 10 }
  ]
}
Response 201: { "id": "...", "estado": "ACTIVO", "detalles": [...] }
Errors: 404 VarianteNoEncontrada, 422 VarianteNoInicializada, 400 DetalleVacio
```

---

### Recuentos de inventario

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/recuentos` | lectura | Lista recuentos del tenant (paginado) |
| `POST` | `/recuentos` | escritura | Registra un recuento físico |
| `GET` | `/recuentos/:id` | lectura | Obtiene recuento con sus detalles |

#### `POST /recuentos`
```json
Request: {
  "observacion": "Recuento semanal",
  "detalles": [
    { "productoId": "...", "varianteId": "...", "stockFisico": 47 }
  ]
}
Response 201: {
  "id": "...",
  "estado": "ACTIVO",
  "detalles": [{ "stockSistema": 50, "stockFisico": 47, "diferencia": -3 }]
}
Errors: 404 VarianteNoEncontrada, 422 VarianteNoInicializada
```

---

## Insumos

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/insumos` | lectura | Lista insumos del tenant (paginado, con filtro stockCritico) |
| `POST` | `/insumos` | escritura | Crea un insumo |
| `GET` | `/insumos/:id` | lectura | Obtiene insumo con estado de stock |
| `PUT` | `/insumos/:id` | escritura | Actualiza datos del insumo |
| `PATCH` | `/insumos/:id/estado` | escritura | Cambia estado (ACTIVO/INACTIVO) |
| `DELETE` | `/insumos/:id` | escritura | Elimina insumo |
| `GET` | `/insumos/:id/movimientos` | lectura | Historial de movimientos del insumo |
| `POST` | `/insumos/:id/ajuste` | escritura | Registra ajuste manual del insumo |

#### `POST /insumos`
```json
Request: {
  "nombre": "Harina de trigo",
  "unidadMedidaId": "...",
  "stockMinimo": 10,
  "costoUnitario": 2.50,
  "fechaVencimiento": "2026-12-31T00:00:00Z"
}
Response 201: { Insumo }
Errors: 409 InsumoNombreDuplicado, 404 UnidadMedidaNoEncontrada
```

#### `PATCH /insumos/:id/estado`
```json
Request: { "estado": "INACTIVO" }
Response 200: { Insumo }
Errors: 422 InsumoEnUsoEnReceta (con lista de productos afectados), 404 InsumoNoEncontrado
```

#### `POST /insumos/:id/ajuste`
```json
Request: {
  "cantidadAjuste": -5,
  "motivo": "Merma por derrame"
}
Response 201: { MovimientoAlmacen }
Errors: 400 MotivoRequerido, 404 InsumoNoEncontrado, 422 InsumoVencido (warning en header)
```

---

## Ingresos de Almacén

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/ingresos` | lectura | Lista ingresos del tenant (paginado) |
| `POST` | `/ingresos` | escritura | Registra ingreso de insumos con proveedor y lote |
| `GET` | `/ingresos/:id` | lectura | Obtiene ingreso con sus detalles |

#### `POST /ingresos`
```json
Request: {
  "proveedorId": "...",
  "descripcion": "Pedido semanal",
  "detalles": [
    {
      "insumoId": "...",
      "cantidad": 50,
      "costoUnitario": 2.50,
      "lote": "L2026-001",
      "fechaVencimiento": "2026-12-31T00:00:00Z"
    }
  ]
}
Response 201: { IngresoAlmacen }
Errors: 404 ProveedorNoEncontrado, 404 InsumoNoEncontrado, 422 InsumoVencido (warning)
```

---

## Salidas de Almacén

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/salidas` | lectura | Lista salidas del tenant (paginado) |
| `POST` | `/salidas` | escritura | Registra salida manual de insumos |
| `GET` | `/salidas/:id` | lectura | Obtiene salida con sus detalles |

#### `POST /salidas`
```json
Request: {
  "descripcion": "Salida para evento",
  "detalles": [
    { "insumoId": "...", "cantidad": 20 }
  ]
}
Response 201: { SalidaAlmacen }
Errors: 404 InsumoNoEncontrado, 422 StockInsuficiente (warning, con confirmacion requerida)
```

---

## Recuentos de Almacén (Insumos)

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/recuentos-almacen` | lectura | Lista recuentos de insumos (paginado) |
| `POST` | `/recuentos-almacen` | escritura | Registra recuento físico de insumos |
| `GET` | `/recuentos-almacen/:id` | lectura | Obtiene recuento con detalles |

---

## Recetas

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/productos/:productoId/receta` | lectura | Obtiene receta del producto base |
| `PUT` | `/productos/:productoId/receta` | escritura | Define/reemplaza receta del producto |
| `DELETE` | `/productos/:productoId/receta` | escritura | Elimina receta del producto |
| `GET` | `/productos/:productoId/variantes/:varianteId/receta` | lectura | Obtiene receta de variante |
| `PUT` | `/productos/:productoId/variantes/:varianteId/receta` | escritura | Define/reemplaza receta de variante |
| `DELETE` | `/productos/:productoId/variantes/:varianteId/receta` | escritura | Elimina receta de variante |

#### `PUT /productos/:productoId/receta`
```json
Request: {
  "lineas": [
    { "insumoId": "...", "cantidad": 0.1 },
    { "insumoId": "...", "cantidad": 0.05 }
  ]
}
Response 200: { lineas: ProductoInsumo[] }
Errors: 404 ProductoNoEncontrado, 404 InsumoNoEncontrado
```

---

## Consumo de Producto

| Método | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `POST` | `/consumo` | escritura | Registra consumo de variante (descuenta stock e insumos) |

#### `POST /consumo`
```json
Request: {
  "productoId": "...",
  "varianteId": "...",
  "cantidad": 10,
  "motivo": "Venta directa",
  "forzar": false  // true = proceder aunque insumos insuficientes
}
Response 201: {
  "stockAntes": 50,
  "stockDespues": 40,
  "insumosBajados": [
    { "insumoId": "...", "nombre": "Harina", "cantidadDescontada": 1.0 }
  ],
  "advertencias": []  // array de warnings (InsumosInsuficientes si aplica)
}
Errors: 422 VarianteNoInicializada, 422 InsumosInsuficientes (si forzar=false)
```

---

## Error Codes

| Código | HTTP | Descripción |
|--------|------|-------------|
| `VARIANTE_NO_ENCONTRADA` | 404 | La variante no existe en el tenant |
| `VARIANTE_NO_INICIALIZADA` | 422 | La variante existe pero no fue inicializada en inventario |
| `VARIANTE_YA_INICIALIZADA` | 409 | La variante ya fue inicializada (no se puede re-inicializar) |
| `INSUMO_NO_ENCONTRADO` | 404 | El insumo no existe en el tenant |
| `INSUMO_NOMBRE_DUPLICADO` | 409 | Ya existe un insumo con ese nombre en el tenant |
| `INSUMO_EN_USO_EN_RECETA` | 422 | El insumo está en recetas activas; incluye lista de productoIds afectados |
| `INSUMO_VENCIDO` | 422 | El insumo tiene fecha de vencimiento pasada (header `X-Warning: insumo-vencido`) |
| `STOCK_INSUFICIENTE` | 422 | Stock de insumos insuficiente; requiere `forzar=true` para proceder |
| `PROVEEDOR_NO_ENCONTRADO` | 404 | El proveedor no existe |
| `DETALLE_VACIO` | 400 | La operación no tiene líneas de detalle |
| `MOTIVO_REQUERIDO` | 400 | El motivo es obligatorio para este tipo de movimiento |
