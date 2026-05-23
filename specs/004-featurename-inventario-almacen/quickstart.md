# Quickstart: Inventario y Almacén

**Feature**: 004-inventario-almacen
**Date**: 2026-05-22

Escenarios de integración end-to-end para validar la implementación.

---

## Escenario 1: Inicializar y mover stock de variante (US1)

**Prerequisito**: Existe producto "Remera" con variantes S, M, L en el catálogo (Feature 003).

```
1. POST /api/almacen/variantes/{varianteS_id}/inicializar
   Body: { "stockInicial": 50, "stockMinimo": 5 }
   Verificar: 200, inventarioActivado=true, cantidadStock=50

2. GET /api/almacen/variantes/{varianteS_id}/stock
   Verificar: cantidadStock=50, stockMinimo=5, inventarioActivado=true

3. POST /api/almacen/ajustes
   Body: { "motivo": "Carga inicial", "detalles": [{ "productoId": "...", "varianteId": "{varianteS_id}", "cantidadAjuste": -3 }] }
   Verificar: 201, stockDespues=47

4. GET /api/almacen/variantes/{varianteS_id}/movimientos
   Verificar: 2 movimientos (CREACION por inicialización + AJUSTE)

5. Intentar mover variante NO inicializada:
   POST /api/almacen/ajustes con varianteM_id (no inicializada)
   Verificar: 422 VARIANTE_NO_INICIALIZADA
```

---

## Escenario 2: Recuento de inventario (US2)

```
1. [Estado inicial] varianteS_id tiene cantidadStock=47

2. POST /api/almacen/recuentos
   Body: {
     "observacion": "Recuento semanal",
     "detalles": [{ "productoId": "...", "varianteId": "{varianteS_id}", "stockFisico": 44 }]
   }
   Verificar: 201, diferencia=-3, stockSistema=47

3. GET /api/almacen/variantes/{varianteS_id}/stock
   Verificar: cantidadStock=44 (ajustado al físico)

4. GET /api/almacen/variantes/{varianteS_id}/movimientos
   Verificar: último movimiento tipo=RECUENTO con stockAntes=47, stockDespues=44

5. GET /api/almacen/recuentos?filterField=observacion&filterOp=contains&filterValue=semanal
   Verificar: aparece el recuento con estado=ACTIVO
```

---

## Escenario 3: Stock crítico y notificación tiempo real (US1 + US5)

```
1. [Conectar dos clientes WebSocket del tenant A]

2. varianteS_id tiene cantidadStock=6, stockMinimo=5

3. POST /api/almacen/ajustes
   Body: { "motivo": "Merma", "detalles": [{ "varianteId": "{varianteS_id}", "cantidadAjuste": -2 }] }
   Resultado: cantidadStock=4 (< stockMinimo=5)

4. Verificar: Ambos clientes WebSocket del tenant A reciben evento:
   almacen:stock:critico { productoNombre: "Remera", varianteSku: "S", stockActual: 4, stockMinimo: 5 }

5. [Conectar cliente WebSocket del tenant B]
   Verificar: tenant B NO recibe el evento

6. POST /api/almacen/ingresos con varianteS_id... (via ajuste positivo)
   POST /api/almacen/ajustes Body: { "detalles": [{ "varianteId": "{varianteS_id}", "cantidadAjuste": 5 }], "motivo": "Reposición" }
   Resultado: cantidadStock=9 (>= stockMinimo=5)

7. Verificar: Clientes del tenant A reciben:
   almacen:stock:normalizado { stockActual: 9, stockMinimo: 5 }
```

---

## Escenario 4: Gestión de insumos y almacén (US3)

```
1. POST /api/almacen/insumos
   Body: { "nombre": "Harina de trigo", "unidadMedidaId": "{kg_id}", "stockMinimo": 10, "costoUnitario": 2.50 }
   Verificar: 201, cantidadStock=0

2. GET /api/almacen/insumos
   Verificar: insumo aparece con estado normal (cantidadStock=0 < stockMinimo=10 → crítico)

3. POST /api/almacen/ingresos
   Body: { "proveedorId": "...", "detalles": [{ "insumoId": "...", "cantidad": 50, "costoUnitario": 2.50, "lote": "L001" }] }
   Verificar: 201, Insumo.cantidadStock=50

4. POST /api/almacen/insumos/{id}/ajuste
   Body: { "cantidadAjuste": -45, "motivo": "Uso en producción" }
   Verificar: cantidadStock=5 (< stockMinimo=10 → crítico)
   Verificar: evento WebSocket almacen:insumo:stock:critico emitido

5. Intentar desactivar insumo que está en receta:
   PATCH /api/almacen/insumos/{id}/estado Body: { "estado": "INACTIVO" }
   Verificar: 422 INSUMO_EN_USO_EN_RECETA con lista de productoIds afectados

6. GET /api/almacen/insumos/{id}/movimientos?filterField=tipo&filterOp=equals&filterValue=INGRESO
   Verificar: solo aparece el movimiento de tipo INGRESO
```

---

## Escenario 5: Recetas y consumo de producto (US4)

```
1. [Prerequisitos] Insumo "Harina" con stock=20, Insumo "Carne" con stock=10
   Producto "Empanada" con variante "Grande" inicializada con stock=100

2. PUT /api/almacen/productos/{empanada_id}/receta
   Body: { "lineas": [{ "insumoId": "{harina_id}", "cantidad": 0.1 }, { "insumoId": "{carne_id}", "cantidad": 0.05 }] }
   Verificar: 200, receta definida a nivel de producto

3. POST /api/almacen/consumo
   Body: { "productoId": "...", "varianteId": "{grande_id}", "cantidad": 10, "motivo": "Venta" }
   Verificar: 201, stockAntes=100, stockDespues=90
   Verificar: harina.cantidadStock=19 (descontó 0.1 * 10 = 1.0)
   Verificar: carne.cantidadStock=9.5 (descontó 0.05 * 10 = 0.5)

4. Variante "Mini" con receta propia diferente:
   PUT /api/almacen/productos/{empanada_id}/variantes/{mini_id}/receta
   Body: { "lineas": [{ "insumoId": "{harina_id}", "cantidad": 0.05 }] }
   Verificar: 200, receta de variante definida

5. POST /api/almacen/consumo con varianteId={mini_id}, cantidad=5
   Verificar: harina.cantidadStock=19 - 0.25 = 18.75 (usó receta de variante)

6. Consumo con insumos insuficientes (forzar=false):
   POST /api/almacen/consumo Body: { "cantidad": 1000, "forzar": false }
   Verificar: 422 STOCK_INSUFICIENTE

7. Consumo forzado con insumos insuficientes:
   POST /api/almacen/consumo Body: { "cantidad": 1000, "forzar": true }
   Verificar: 201 con advertencias, insumos en negativo
```

---

## Escenario 6: Recuento de almacén de insumos (US3)

```
1. POST /api/almacen/recuentos-almacen
   Body: {
     "observacion": "Recuento mensual",
     "detalles": [
       { "insumoId": "{harina_id}", "stockFisico": 17 }
     ]
   }
   Verificar: 201, stockSistema=18.75 (o el valor actual), diferencia calculada

2. GET /api/almacen/insumos/{harina_id}
   Verificar: cantidadStock ajustado al valor físico del recuento

3. GET /api/almacen/recuentos-almacen
   Verificar: aparece el recuento con estado=ACTIVO
```
