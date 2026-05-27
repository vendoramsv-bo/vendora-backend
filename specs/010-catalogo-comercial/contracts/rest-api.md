# REST API Contracts: Catálogo — Capacidades Faltantes

**Feature**: 010-catalogo-comercial  
**Base path**: `/api/catalogo`  
**Auth**: `requireAuth` + `requireTenantActivo` en todos los endpoints  
**Date**: 2026-05-26

> Este documento cubre solo las **7 nuevas rutas**. Las rutas existentes están documentadas en `specs/003-catalogo-comercial/contracts/`.

---

## 1. Verificar código duplicado

### `GET /api/catalogo/productos/verificar-codigo`

Verifica si un código de producto ya existe en el tenant antes de crear.

**Roles permitidos**: PROPIETARIO, ADMIN, ENCARGADO

**Query params**:
| Param | Type | Required | Description |
|---|---|---|---|
| `codigo` | string | ✅ | Código a verificar (trim aplicado) |

**Responses**:

**200 — Código no existe**:
```json
{ "existe": false }
```

**200 — Código ya existe**:
```json
{
  "existe": true,
  "producto": {
    "id": "prod_abc123",
    "nombre": "Camisa Blanca Talla M",
    "codigo": "CAM-001"
  }
}
```

**400 — Falta el parámetro `codigo`**:
```json
{ "code": "VALIDATION_ERROR", "message": "codigo es requerido" }
```

---

## 2. Eliminar producto

### `DELETE /api/catalogo/productos/:id`

Elimina un producto y su movimiento de inventario de tipo CREACION. Las relaciones con ventas, compras y pedidos existentes quedan con `productoId = null` (SetNull según schema).

**Roles permitidos**: PROPIETARIO, ADMIN

**Path params**:
| Param | Type | Description |
|---|---|---|
| `id` | string | ID del producto |

**Responses**:

**200**:
```json
{ "deleted": true }
```

**404**:
```json
{ "code": "PRODUCTO_NO_ENCONTRADO", "message": "Producto no encontrado" }
```

**403**:
```json
{ "code": "NO_AUTORIZADO", "message": "Se requiere rol PROPIETARIO o ADMIN" }
```

---

## 3. Crear producto (campo tipoDescuento agregado)

### `POST /api/catalogo/productos` — MODIFICADO

Se añade `tipoDescuento` como campo obligatorio al body existente.

**Body — campos nuevos/modificados**:
```json
{
  "...camposExistentes": "...",
  "tipoDescuento": "SIN_DESCUENTO"
}
```

**Validation**:
- `tipoDescuento`: `z.enum(["SIN_DESCUENTO", "PORCENTAJE", "MONTO_FIJO"])`, obligatorio
- `porcentajeDescuento`: number optional (requerido si tipoDescuento = "PORCENTAJE")
- `montoDescuento`: number optional (requerido si tipoDescuento = "MONTO_FIJO")

---

## 4. Generar propuesta de variantes (cartesiano)

### `GET /api/catalogo/productos/:id/variantes/propuesta`

Calcula y devuelve el producto cartesiano de los atributos ya definidos para el producto, sin persistir. El cliente presenta el resultado al usuario para que elimine combinaciones no deseadas.

**Roles permitidos**: PROPIETARIO, ADMIN, ENCARGADO

**Path params**:
| Param | Type | Description |
|---|---|---|
| `id` | string | ID del producto |

**Responses**:

**200**:
```json
{
  "propuesta": [
    {
      "etiqueta": "Talla S / Color Rojo",
      "combinacion": [
        { "atributo": "Talla", "valor": "S", "atributoValorId": "av_001" },
        { "atributo": "Color", "valor": "Rojo", "atributoValorId": "av_005" }
      ]
    },
    {
      "etiqueta": "Talla S / Color Azul",
      "combinacion": [
        { "atributo": "Talla", "valor": "S", "atributoValorId": "av_001" },
        { "atributo": "Color", "valor": "Azul", "atributoValorId": "av_006" }
      ]
    }
  ],
  "total": 6
}
```

**400 — Producto sin atributos definidos**:
```json
{ "code": "SIN_ATRIBUTOS", "message": "El producto no tiene atributos definidos" }
```

---

## 5. Confirmar y crear variantes (batch)

### `POST /api/catalogo/productos/:id/variantes/confirmar`

Persiste el subconjunto de variantes seleccionadas por el usuario tras revisar la propuesta.

**Roles permitidos**: PROPIETARIO, ADMIN

**Path params**:
| Param | Type | Description |
|---|---|---|
| `id` | string | ID del producto |

**Body**:
```json
{
  "variantes": [
    {
      "atributoValorIds": ["av_001", "av_005"],
      "precio": 25.00,
      "cantidadStock": 10,
      "imagenUrl": null
    },
    {
      "atributoValorIds": ["av_001", "av_006"],
      "precio": 25.00,
      "cantidadStock": 8,
      "imagenUrl": null
    }
  ]
}
```

**Validation**:
- `variantes`: array no vacío (min 1 elemento)
- Cada elemento: `atributoValorIds` array de strings (min 1)
- `precio`: number >= 0, opcional
- `cantidadStock`: int >= 0, opcional

**Responses**:

**201**:
```json
{
  "creadas": [
    { "id": "var_001", "etiqueta": "Talla S / Color Rojo", "precio": 25.00, "cantidadStock": 10 },
    { "id": "var_002", "etiqueta": "Talla S / Color Azul", "precio": 25.00, "cantidadStock": 8 }
  ],
  "total": 2
}
```

**400 — Lista vacía**:
```json
{ "code": "VALIDATION_ERROR", "message": "Se requiere al menos una variante" }
```

**409 — SKU/combinación duplicada**:
```json
{ "code": "VARIANTE_DUPLICADA", "message": "Una o más combinaciones ya existen como variante" }
```

---

## 6. Alta masiva desde catálogo maestro

### `POST /api/catalogo/productos/alta-masiva`

Crea múltiples productos a partir de plantillas del catálogo maestro (ClaProducto). Operación atómica.

**Roles permitidos**: PROPIETARIO, ADMIN

**Body**:
```json
{
  "claProductoIds": ["cla_001", "cla_002", "cla_003"]
}
```

**Validation**:
- `claProductoIds`: array de strings, min 1 elemento

**Responses**:

**201 — Todos creados exitosamente**:
```json
{
  "creados": [
    { "id": "prod_abc", "nombre": "Acetaminofén 500mg", "codigo": "MED-001", "tipoProducto": "SERVICIO" },
    { "id": "prod_def", "nombre": "Ibuprofeno 400mg",   "codigo": "MED-002", "tipoProducto": "SERVICIO" }
  ],
  "total": 2,
  "categoriasCreadas": 1,
  "unidadesMedidaCreadas": 0
}
```

**400 — Lista vacía**:
```json
{ "code": "ALTA_MASIVA_VACIA", "message": "Se requiere al menos una plantilla del catálogo maestro" }
```

**404 — Alguna plantilla no existe** (operación no ejecutada):
```json
{
  "code": "CLA_PRODUCTO_NO_ENCONTRADO",
  "message": "Las siguientes plantillas no existen en el catálogo maestro",
  "ids": ["cla_999", "cla_888"]
}
```

---

## 7. Notificaciones Socket.IO — nuevos eventos

Emitidos al room `tenant:${tenantId}` para los eventos faltantes:

### `catalogo:producto-eliminado`
```typescript
{
  tenantId: string
  productoId: string
  nombre: string         // para que el cliente pueda mostrar "Producto X eliminado"
}
```

### `catalogo:variantes-generadas`
```typescript
{
  tenantId: string
  productoId: string
  cantidadVariantes: number
}
```

### `catalogo:alta-masiva-completada`
```typescript
{
  tenantId: string
  productosCreados: number
  categoriasCreadas: number
  unidadesMedidaCreadas: number
}
```

---

## Cambios en errores HTTP mapping (handleCatalogoError)

| Error de dominio | HTTP | code |
|---|---|---|
| `ProductoConMovimientos` | 409 | `PRODUCTO_CON_MOVIMIENTOS` |
| `AltaMasivaVacia` | 400 | `ALTA_MASIVA_VACIA` |
| `ClaProductoNoEncontrado` | 404 | `CLA_PRODUCTO_NO_ENCONTRADO` |
