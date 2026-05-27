# Quickstart: Catálogo Comercial — Capacidades Faltantes

**Feature**: 010-catalogo-comercial  
**Date**: 2026-05-26

> Validación manual de las 7 nuevas capacidades. Los escenarios asumen tenant activo y usuario autenticado con rol ADMIN. Usa un cliente REST (Bruno, Postman, curl).

---

## Escenario 1: Verificar código duplicado

**Objetivo**: Confirmar que el endpoint de pre-check funciona antes de crear.

```
# 1. Crear un producto con código "PROD-001"
POST /api/catalogo/productos
{ "codigo": "PROD-001", "nombre": "Test", "actividadId": "...", "categoriaId": "...", "unidadId": "...", "tipoDescuento": "SIN_DESCUENTO" }

# 2. Verificar que el código existe
GET /api/catalogo/productos/verificar-codigo?codigo=PROD-001
→ Esperar: { "existe": true, "producto": { "id": "...", "nombre": "Test", "codigo": "PROD-001" } }

# 3. Verificar un código que no existe
GET /api/catalogo/productos/verificar-codigo?codigo=NO-EXISTE
→ Esperar: { "existe": false }
```

**PASS criteria**: El pre-check devuelve el producto existente; código inexistente devuelve `existe: false`.

---

## Escenario 2: tipoDescuento como campo obligatorio

**Objetivo**: Confirmar que el campo es requerido y aceptado en la creación.

```
# 1. Intentar crear sin tipoDescuento
POST /api/catalogo/productos
{ "codigo": "PROD-002", "nombre": "Sin descuento field", ... }
→ Esperar: 400 VALIDATION_ERROR

# 2. Crear con tipoDescuento = "PORCENTAJE"
POST /api/catalogo/productos
{ "codigo": "PROD-002", "nombre": "Con porcentaje", ..., "tipoDescuento": "PORCENTAJE", "porcentajeDescuento": 10 }
→ Esperar: 201, producto con tipoDescuento = "PORCENTAJE"
```

**PASS criteria**: Sin `tipoDescuento` falla; con valor válido crea correctamente.

---

## Escenario 3: Movimiento de inventario al crear producto

**Objetivo**: Confirmar que crear un producto COMERCIALIZACION registra MovimientoInventario CREACION.

```
# 1. Crear producto tipo COMERCIALIZACION con cantidadStock = 50
POST /api/catalogo/productos
{ ..., "tipoProducto": "COMERCIALIZACION", "cantidadStock": 50, "tipoDescuento": "SIN_DESCUENTO" }
→ Guardar el id devuelto como $productoId

# 2. (Via BD o endpoint de almacen) Verificar que existe MovimientoInventario
SELECT * FROM almacen."MovimientoInventario" WHERE "productoId" = '$productoId' AND tipo = 'CREACION';
→ Esperar: 1 registro, cantidad = 50, stockDespues = 50

# 3. Crear producto tipo SERVICIO con cantidadStock = 20
POST /api/catalogo/productos
{ ..., "tipoProducto": "SERVICIO", "cantidadStock": 20, "tipoDescuento": "SIN_DESCUENTO" }
→ Guardar el id como $servicioId

# 4. Verificar que NO existe MovimientoInventario para el SERVICIO
SELECT COUNT(*) FROM almacen."MovimientoInventario" WHERE "productoId" = '$servicioId';
→ Esperar: COUNT = 0
```

**PASS criteria**: COMERCIALIZACION genera 1 movimiento CREACION; SERVICIO no genera ninguno.

---

## Escenario 4: Protección del stock inicial

**Objetivo**: Confirmar que el stock inicial solo es editable si no hay movimientos reales.

```
# Continúa con $productoId del escenario 3

# 1. Modificar stock inicial (solo hay movimiento CREACION) → debe permitirlo
PUT /api/catalogo/productos/$productoId
{ "cantidadStock": 75 }
→ Esperar: 200, producto con cantidadStock = 75
→ Verificar: MovimientoInventario CREACION ahora tiene cantidad = 75

# 2. (Simular un movimiento real vía BD — ENTRADA de almacen module)
INSERT INTO almacen."MovimientoInventario" (tenantId, productoId, tipo, cantidad, ...) VALUES (..., 'ENTRADA', 10, ...);

# 3. Intentar modificar stock inicial después de movimiento real
PUT /api/catalogo/productos/$productoId
{ "cantidadStock": 100 }
→ Esperar: 409 PRODUCTO_CON_MOVIMIENTOS
```

**PASS criteria**: Permite modificar stock inicial con solo movimiento CREACION; bloquea con movimientos reales.

---

## Escenario 5: Eliminar producto y limpieza del movimiento

**Objetivo**: Confirmar que DELETE limpia el movimiento CREACION y el producto.

```
# Crear producto COMERCIALIZACION con stock 30
POST /api/catalogo/productos → guardar $productoId

# Verificar movimiento CREACION existe
SELECT COUNT(*) FROM almacen."MovimientoInventario" WHERE "productoId" = '$productoId';
→ Esperar: COUNT = 1

# Eliminar producto
DELETE /api/catalogo/productos/$productoId
→ Esperar: 200, { "deleted": true }

# Verificar que el producto ya no existe
GET /api/catalogo/productos/$productoId
→ Esperar: 404 PRODUCTO_NO_ENCONTRADO

# Verificar que el movimiento CREACION fue eliminado
SELECT COUNT(*) FROM almacen."MovimientoInventario" WHERE "productoId" = '$productoId';
→ Esperar: COUNT = 0
```

**PASS criteria**: Producto y movimiento CREACION eliminados; 404 para el producto.

---

## Escenario 6: Generación cartesiana de variantes (modo híbrido)

**Objetivo**: Confirmar el flujo propuesta → revisión → confirmación.

```
# 1. Crear producto
POST /api/catalogo/productos → $productoId

# 2. Crear atributo "Talla" con valores S, M, L
POST /api/catalogo/productos/$productoId/atributos
{ "nombre": "Talla", "tipo": "TEXTO" } → $atributoTallaId

POST /api/catalogo/productos/$productoId/atributos/$atributoTallaId/valores
{ "valor": "S" }; { "valor": "M" }; { "valor": "L" }

# 3. Crear atributo "Color" con valores Rojo, Azul
POST /api/catalogo/productos/$productoId/atributos → $atributoColorId
POST .../valores → Rojo, Azul

# 4. Obtener propuesta cartesiana (6 combinaciones: S/R, S/A, M/R, M/A, L/R, L/A)
GET /api/catalogo/productos/$productoId/variantes/propuesta
→ Esperar: { "propuesta": [ ... 6 items ... ], "total": 6 }

# 5. Confirmar solo 4 (el usuario eliminó S/Azul y L/Rojo)
POST /api/catalogo/productos/$productoId/variantes/confirmar
{
  "variantes": [
    { "atributoValorIds": ["avS", "avRojo"], "precio": 25 },
    { "atributoValorIds": ["avM", "avRojo"], "precio": 25 },
    { "atributoValorIds": ["avM", "avAzul"], "precio": 27 },
    { "atributoValorIds": ["avL", "avAzul"], "precio": 27 }
  ]
}
→ Esperar: 201, { "creadas": [...], "total": 4 }

# 6. Verificar variantes persistidas
GET /api/catalogo/productos/$productoId/variantes
→ Esperar: 4 variantes
```

**PASS criteria**: Propuesta calcula 6 combinaciones; confirmación persiste solo las 4 seleccionadas.

---

## Escenario 7: Alta masiva desde catálogo maestro

**Objetivo**: Confirmar creación en lote de productos y auto-creación de categorías/unidades.

```
# Prerequisito: conocer IDs de ClaProducto en la BD (tabla compartido."ClaProducto")
SELECT id, nombre, "claCategoriaId", "claUnidadId" FROM compartido."ClaProducto" LIMIT 3;
→ Guardar los 3 IDs como $id1, $id2, $id3

# Alta masiva con 3 plantillas
POST /api/catalogo/productos/alta-masiva
{ "claProductoIds": ["$id1", "$id2", "$id3"] }
→ Esperar: 201, { "creados": [3 productos], "total": 3, "categoriasCreadas": N, "unidadesMedidaCreadas": N }

# Verificar que los productos tienen cantidadStock = 0
GET /api/catalogo/productos?limit=10
→ Los 3 nuevos productos deben tener cantidadStock = 0

# Probar con ID de plantilla inexistente
POST /api/catalogo/productos/alta-masiva
{ "claProductoIds": ["$id1", "CLA_ID_FALSO"] }
→ Esperar: 404, { "code": "CLA_PRODUCTO_NO_ENCONTRADO", "ids": ["CLA_ID_FALSO"] }
→ Verificar: NINGÚN producto fue creado (operación atómica)

# Probar con lista vacía
POST /api/catalogo/productos/alta-masiva
{ "claProductoIds": [] }
→ Esperar: 400, { "code": "ALTA_MASIVA_VACIA" }
```

**PASS criteria**: Lote de 3 creado con stock cero; ID falso aborta todo; lista vacía rechazada.

---

## Escenario 8: Eventos en tiempo real

**Objetivo**: Confirmar que las operaciones nuevas emiten eventos Socket.IO.

```
# Abrir dos sesiones del mismo tenant con un cliente Socket.IO
# Sesión B suscrita a room "tenant:{tenantId}"

# Desde Sesión A:
DELETE /api/catalogo/productos/$cualquierProductoId

# En Sesión B:
→ Esperar evento "catalogo:producto-eliminado" con { productoId, nombre }

# Desde Sesión A:
POST /api/catalogo/productos/alta-masiva { "claProductoIds": ["..."] }

# En Sesión B:
→ Esperar evento "catalogo:alta-masiva-completada" con { productosCreados, ... }
```

**PASS criteria**: Sesión B recibe los eventos correspondientes < 2 s.
