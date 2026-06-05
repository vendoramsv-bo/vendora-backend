# REST API Contracts: Inventario de Productos y Almacén de Insumos

**Branch**: `011-inventario-almacen` | **Date**: 2026-05-26  
**Base path**: `/api/almacen` (montado en el router existente de `almacen`)  
**Auth**: Bearer token de Better-Auth en todas las rutas. Roles requeridos indicados por ruta.

---

## Inventario de Productos

### Obtener stock de variante *(existente — sin cambios)*

```
GET /inventario/variantes/:varianteId/stock
Roles: todos
```

**Response 200**
```json
{
  "varianteId": "cuid",
  "productoId": "cuid",
  "cantidadStock": 30,
  "stockMinimo": 5,
  "inventarioActivado": true
}
```

---

### Listar movimientos de variante *(existente — sin cambios)*

```
GET /inventario/variantes/:varianteId/movimientos?take=20&skip=0&order=createdAt:desc
Roles: todos
```

**Response 200** — `{ data: MovimientoInventario[], meta: { take, total, hasMore, nextCursor } }`

---

### Auto-inicializar stock del tenant *(nuevo — FR-020)*

```
POST /inventario/inicializar
Roles: PROPIETARIO
```

Inicializa `inventarioActivado = true` y `cantidadStock = 0` para todos los productos y variantes del tenant que aún no estén inicializados. Registra movimiento `CREACION` por cada ítem.

**Response 202** — Accepted (operación de larga duración, puede enviarse como job BullMQ)
```json
{ "productosInicializados": 42, "variantesInicializadas": 127 }
```

---

## Ajustes de Inventario

### Listar ajustes *(existente — sin cambios)*

```
GET /inventario/ajustes?take=20&skip=0&estado=PENDIENTE
Roles: todos
Filtros: estado, motivo, fecha
```

**Response 200** — `{ data: AjusteInventario[], meta: PaginationMeta }`

---

### Crear ajuste (borrador) *(reemplaza POST /ajustes directo)*

```
POST /inventario/ajustes
Roles: PROPIETARIO, ADMIN
```

**Body**
```json
{
  "motivo": "Corrección de merma",
  "detalles": [
    { "productoId": "cuid", "varianteId": "cuid", "cantidadAjuste": -5 },
    { "productoId": "cuid2", "varianteId": null, "cantidadAjuste": 10 }
  ]
}
```

**Response 201**
```json
{
  "ajusteId": "cuid",
  "estado": "PENDIENTE",
  "version": 0,
  "motivo": "Corrección de merma",
  "detalles": [...]
}
```

**Errores**: `400 DETALLE_VACIO`, `404 VARIANTE_NO_ENCONTRADA`

---

### Obtener ajuste

```
GET /inventario/ajustes/:ajusteId
Roles: todos
```

**Response 200** — `AjusteInventario` con detalles y `version`

---

### Actualizar ajuste (solo PENDIENTE) *(nuevo — FR-022)*

```
PATCH /inventario/ajustes/:ajusteId
Roles: PROPIETARIO, ADMIN
```

**Body** — misma estructura que el create; todos los campos opcionales

**Response 200** — `AjusteInventario` actualizado con `version` (sin cambio de versión en PATCH; solo cambia al aprobar)

**Errores**: `404 AJUSTE_NO_ENCONTRADO`, `409 DOCUMENTO_YA_APROBADO`

---

### Aprobar ajuste *(nuevo — FR-004, FR-006, FR-023)*

```
POST /inventario/ajustes/:ajusteId/aprobar
Roles: PROPIETARIO, ADMIN
```

**Body**
```json
{ "version": 0 }
```

**Response 200**
```json
{
  "ajusteId": "cuid",
  "estado": "APROBADO",
  "version": 1,
  "detalles": [
    {
      "productoId": "cuid",
      "varianteId": "cuid",
      "stockAntes": 10,
      "stockDespues": 5,
      "stockMinimo": 3
    }
  ]
}
```

**Errores**:
- `404 AJUSTE_NO_ENCONTRADO`
- `409 DOCUMENTO_YA_APROBADO`
- `409 CONFLICTO_VERSION` — stock modificado entre carga y aprobación
- `422 STOCK_NEGATIVO` — `{ productoId, varianteId, stockResultante }`

---

## Recuentos de Inventario

### Listar recuentos *(existente — sin cambios)*

```
GET /inventario/recuentos?take=20&skip=0&estado=PENDIENTE
Roles: todos
```

---

### Crear recuento (borrador) *(reemplaza POST /recuentos directo)*

```
POST /inventario/recuentos
Roles: PROPIETARIO, ADMIN
```

**Body**
```json
{
  "observacion": "Recuento mensual enero",
  "detalles": [
    { "productoId": "cuid", "varianteId": "cuid", "stockFisico": 47 }
  ]
}
```

**Response 201**
```json
{
  "recuentoId": "cuid",
  "estado": "PENDIENTE",
  "version": 0,
  "detalles": [
    { "productoId": "cuid", "varianteId": "cuid", "stockSistema": 50, "stockFisico": 47, "diferencia": -3 }
  ]
}
```

**Nota**: `stockSistema` se captura en el momento de crear el borrador.

---

### Obtener recuento

```
GET /inventario/recuentos/:recuentoId
Roles: todos
```

---

### Actualizar recuento (solo PENDIENTE) *(nuevo — FR-022)*

```
PATCH /inventario/recuentos/:recuentoId
Roles: PROPIETARIO, ADMIN
```

**Body** — misma estructura que el create; todos los campos opcionales

**Errores**: `404`, `409 DOCUMENTO_YA_APROBADO`

---

### Aprobar recuento *(nuevo — FR-005, FR-006, FR-023)*

```
POST /inventario/recuentos/:recuentoId/aprobar
Roles: PROPIETARIO, ADMIN
```

**Body** — `{ "version": 0 }`

**Response 200**
```json
{
  "recuentoId": "cuid",
  "estado": "APROBADO",
  "version": 1,
  "detalles": [
    { "productoId": "cuid", "varianteId": "cuid", "stockAntes": 50, "stockDespues": 47, "diferencia": -3 }
  ]
}
```

**Errores**: `404`, `409 DOCUMENTO_YA_APROBADO`, `409 CONFLICTO_VERSION`, `422 STOCK_NEGATIVO`

---

## Almacén de Insumos

### Insumos *(existentes — sin cambios de contrato)*

```
GET    /insumos                    Lista con paginación y filtros
POST   /insumos                    Crear insumo (PROPIETARIO, ADMIN)
GET    /insumos/:insumoId          Obtener insumo
PATCH  /insumos/:insumoId          Actualizar insumo (PROPIETARIO, ADMIN)
DELETE /insumos/:insumoId          Eliminar insumo (PROPIETARIO, ADMIN)
GET    /insumos/:insumoId/movimientos  Historial de movimientos de almacén
```

---

### Receta *(existente — sin cambios)*

```
GET    /recetas/:productoId        Obtener composición de un producto
POST   /recetas/:productoId        Definir composición (PROPIETARIO, ADMIN)
DELETE /recetas/:productoId        Eliminar composición (PROPIETARIO, ADMIN)
```

---

### Ingresos de Almacén

#### Listar ingresos *(existente — sin cambios de contrato)*

```
GET /almacen/ingresos?take=20&skip=0&estado=PENDIENTE
Roles: todos
```

#### Crear ingreso (borrador) *(refactorizado — ya no aplica stock)*

```
POST /almacen/ingresos
Roles: PROPIETARIO, ADMIN
```

**Body**
```json
{
  "proveedorId": "cuid",
  "descripcion": "Ingreso semanal",
  "detalles": [
    {
      "insumoId": "cuid",
      "cantidad": 50,
      "costoUnitario": 2.50,
      "lote": "L001",
      "fechaVencimiento": "2026-12-31"
    }
  ]
}
```

**Response 201**
```json
{
  "ingresoId": "cuid",
  "estado": "PENDIENTE",
  "version": 0,
  "detalles": [...]
}
```

**Nota**: El stock NO cambia. Solo se crea el documento.

#### Obtener ingreso *(nuevo)*

```
GET /almacen/ingresos/:ingresoId
Roles: todos
```

#### Actualizar ingreso (solo PENDIENTE) *(nuevo — FR-022)*

```
PATCH /almacen/ingresos/:ingresoId
Roles: PROPIETARIO, ADMIN
```

**Body** — misma estructura que el create; todos los campos opcionales.

#### Aprobar ingreso *(nuevo — FR-012, FR-014, FR-023, FR-024)*

```
POST /almacen/ingresos/:ingresoId/aprobar
Roles: PROPIETARIO, ADMIN
```

**Body** — `{ "version": 0 }`

**Response 200**
```json
{
  "ingresoId": "cuid",
  "estado": "APROBADO",
  "version": 1,
  "detalles": [
    { "insumoId": "cuid", "insumoNombre": "Harina de trigo", "cantidad": 50, "stockAntes": 0, "stockDespues": 50 }
  ]
}
```

**Errores**: `404 INGRESO_NO_ENCONTRADO`, `409 DOCUMENTO_YA_APROBADO`, `409 CONFLICTO_VERSION`

---

### Salidas de Almacén

#### Listar salidas *(existente — sin cambios de contrato)*

```
GET /almacen/salidas?take=20&skip=0&estado=PENDIENTE
Roles: todos
```

#### Crear salida (borrador) *(refactorizado — ya no aplica stock)*

```
POST /almacen/salidas
Roles: PROPIETARIO, ADMIN
```

**Body**
```json
{
  "motivo": "Consumo de producción",
  "detalles": [
    { "insumoId": "cuid", "cantidad": 10 }
  ]
}
```

**Response 201** — `{ "salidaId": "cuid", "estado": "PENDIENTE", "version": 0, "detalles": [...] }`

#### Obtener salida *(nuevo)*

```
GET /almacen/salidas/:salidaId
Roles: todos
```

#### Actualizar salida (solo PENDIENTE) *(nuevo — FR-022)*

```
PATCH /almacen/salidas/:salidaId
Roles: PROPIETARIO, ADMIN
```

#### Aprobar salida *(nuevo — FR-012, FR-013, FR-014, FR-023, FR-024)*

```
POST /almacen/salidas/:salidaId/aprobar
Roles: PROPIETARIO, ADMIN
```

**Body** — `{ "version": 0 }`

**Response 200** — `{ "salidaId": "cuid", "estado": "APROBADO", "version": 1, "detalles": [...] }`

**Errores**: `404`, `409 DOCUMENTO_YA_APROBADO`, `409 CONFLICTO_VERSION`, `422 STOCK_NEGATIVO_INSUMO`

---

## Errores de dominio nuevos

| Code | HTTP | Descripción |
|---|---|---|
| `STOCK_NEGATIVO` | 422 | La aprobación dejaría un producto/variante con stock negativo |
| `STOCK_NEGATIVO_INSUMO` | 422 | La aprobación dejaría un insumo con stock negativo |
| `CONFLICTO_VERSION` | 409 | El documento fue modificado; refrescar y reintentar |
| `DOCUMENTO_YA_APROBADO` | 409 | El documento ya fue aprobado; es inmutable |
| `AJUSTE_NO_ENCONTRADO` | 404 | — |
| `RECUENTO_NO_ENCONTRADO` | 404 | — |
| `INGRESO_NO_ENCONTRADO` | 404 | — |
| `SALIDA_NO_ENCONTRADA` | 404 | — |

---

## Socket.IO — eventos de tiempo real *(sin cambios de contrato, mismo IAlmacenNotificador)*

| Evento | Sala | Payload |
|---|---|---|
| `almacen:stock-critico` | `tenant:${tenantId}` | `{ productoId, productoNombre, varianteId?, varianteSku?, stockActual, stockMinimo }` |
| `almacen:stock-normalizado` | `tenant:${tenantId}` | igual |
| `almacen:insumo-stock-critico` | `tenant:${tenantId}` | `{ insumoId, insumoNombre, stockActual, stockMinimo }` |
| `almacen:insumo-stock-normalizado` | `tenant:${tenantId}` | igual |

Los eventos se emiten desde los use cases de aprobación vía el puerto `IAlmacenNotificador` existente.
