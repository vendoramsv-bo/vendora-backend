# Quickstart: Inventario de Productos y Almacén de Insumos

**Branch**: `011-inventario-almacen` | **Date**: 2026-05-26

Escenarios de validación manual para verificar las capacidades principales del feature.

---

## Prerequisitos

1. Tenant activo con productos y variantes en el catálogo (Feature 010).
2. Al menos un proveedor configurado (Feature 005).
3. Al menos un insumo creado.
4. Bearer token de sesión como PROPIETARIO o ADMIN.

---

## Escenario 1: Auto-inicialización de stock

```bash
# Inicializar inventario para todos los productos/variantes del tenant
POST /api/almacen/inventario/inicializar
Authorization: Bearer <token>

# Verificar que el stock de una variante queda en 0
GET /api/almacen/inventario/variantes/<varianteId>/stock
# → cantidadStock: 0, inventarioActivado: true
```

**Validación**: El movimiento CREACION debe aparecer en el historial de la variante.

---

## Escenario 2: Ajuste borrador → aprobación

```bash
# 1. Crear ajuste en borrador (+10 unidades)
POST /api/almacen/inventario/ajustes
{
  "motivo": "Ingreso de mercadería inicial",
  "detalles": [{ "productoId": "<id>", "varianteId": "<id>", "cantidadAjuste": 10 }]
}
# → { "ajusteId": "abc123", "estado": "PENDIENTE", "version": 0 }

# 2. Verificar que el stock NO cambió
GET /api/almacen/inventario/variantes/<varianteId>/stock
# → cantidadStock: 0  (sigue igual)

# 3. Aprobar el ajuste
POST /api/almacen/inventario/ajustes/abc123/aprobar
{ "version": 0 }
# → { "estado": "APROBADO", "version": 1, "detalles": [{ "stockAntes": 0, "stockDespues": 10 }] }

# 4. Verificar que el stock cambió
GET /api/almacen/inventario/variantes/<varianteId>/stock
# → cantidadStock: 10
```

---

## Escenario 3: Ajuste rechazado por stock negativo

```bash
# Con variante en stock = 5:
POST /api/almacen/inventario/ajustes
{ "motivo": "Test negativo", "detalles": [{ "productoId": "<id>", "varianteId": "<id>", "cantidadAjuste": -10 }] }
# → 201, ajusteId = "def456", estado PENDIENTE

POST /api/almacen/inventario/ajustes/def456/aprobar
{ "version": 0 }
# → 422 STOCK_NEGATIVO { productoId, varianteId, stockResultante: -5 }
# Stock sigue en 5, sin cambios parciales.
```

---

## Escenario 4: Conflicto optimista (dos aprobaciones concurrentes)

```bash
# Operador A y Operador B ambos obtienen el ajuste con version=0

# Operador A aprueba primero:
POST /api/almacen/inventario/ajustes/abc/aprobar { "version": 0 }
# → 200, version: 1

# Operador B intenta aprobar con version=0 obsoleta:
POST /api/almacen/inventario/ajustes/abc/aprobar { "version": 0 }
# → 409 CONFLICTO_VERSION
```

---

## Escenario 5: Recuento físico

```bash
# Stock sistema = 50, operador cuenta 47 físicamente
POST /api/almacen/inventario/recuentos
{
  "observacion": "Recuento mensual",
  "detalles": [{ "productoId": "<id>", "varianteId": "<id>", "stockFisico": 47 }]
}
# → { recuentoId: "ghi", estado: PENDIENTE, detalles: [{ stockSistema: 50, stockFisico: 47, diferencia: -3 }] }

POST /api/almacen/inventario/recuentos/ghi/aprobar { "version": 0 }
# → 200, stockDespues: 47, diferencia: -3

GET /api/almacen/inventario/variantes/<id>/stock
# → cantidadStock: 47
```

---

## Escenario 6: Ingreso de almacén borrador → aprobación

```bash
POST /api/almacen/ingresos
{
  "proveedorId": "<id>",
  "detalles": [{ "insumoId": "<id>", "cantidad": 50, "costoUnitario": 2.50, "lote": "L001" }]
}
# → { ingresoId: "jkl", estado: PENDIENTE, version: 0 }
# El stock del insumo NO cambia aún.

POST /api/almacen/ingresos/jkl/aprobar { "version": 0 }
# → 200 APROBADO, stockDespues: 50

# Verificar stock de insumo
GET /api/almacen/insumos/<insumoId>
# → cantidadStock: 50
```

---

## Escenario 7: Salida rechazada por stock insuficiente

```bash
# Con insumo en stock = 30, intentar salida de 50:
POST /api/almacen/salidas
{ "motivo": "Consumo de prueba", "detalles": [{ "insumoId": "<id>", "cantidad": 50 }] }
# → 201 PENDIENTE

POST /api/almacen/salidas/<id>/aprobar { "version": 0 }
# → 422 STOCK_NEGATIVO_INSUMO { insumoId, stockResultante: -20 }
```

---

## Escenario 8: Alerta de stock crítico en tiempo real

1. Conectar dos clientes WebSocket al tenant (misma sala `tenant:<tenantId>`).
2. Aprobar un ajuste que deje una variante con `cantidadStock < stockMinimo`.
3. Verificar que ambos clientes reciben el evento `almacen:stock-critico` en < 2 segundos.
4. Conectar un cliente de otro tenant y verificar que NO recibe el evento.

---

## Escenario 9: Idempotencia — reprocessamiento de venta

```bash
# Simular llamada de Feature 006 con la misma ventaId dos veces:
# Primera llamada crea MovimientoInventario con referenciaId=ventaId
# Segunda llamada actualiza el mismo MovimientoInventario (upsert)
# Solo debe existir UN movimiento por ventaId

GET /api/almacen/inventario/variantes/<id>/movimientos
# → exactamente UN movimiento SALIDA con referenciaId = <ventaId>
```

---

## Escenario 10: Editabilidad de borradores

```bash
POST /api/almacen/inventario/ajustes
{ "motivo": "Error inicial", "detalles": [{ "productoId": "<id>", "varianteId": "<id>", "cantidadAjuste": 5 }] }
# → ajusteId: "mno", version: 0

PATCH /api/almacen/inventario/ajustes/mno
{ "motivo": "Corrección real", "detalles": [{ "productoId": "<id>", "varianteId": "<id>", "cantidadAjuste": 8 }] }
# → 200, motivo actualizado

# Intentar editar tras aprobación:
POST /api/almacen/inventario/ajustes/mno/aprobar { "version": 0 }
PATCH /api/almacen/inventario/ajustes/mno { "motivo": "Intento post-aprobación" }
# → 409 DOCUMENTO_YA_APROBADO
```
