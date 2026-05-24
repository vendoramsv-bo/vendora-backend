# Quickstart: Gestión de Clientes, Proveedores y Compras

**Feature**: 005-clientes-proveedores-compras  
**Prerequisites**: Tenant activo, usuario autenticado con rol PROPIETARIO o ADMIN, productos/variantes del catálogo (Feature 003), variantes con inventario activado (Feature 004)

---

## Escenario 1: Crear y buscar clientes

```
# 1. Crear cliente
POST /api/ventas/clientes
Body: { "nombre": "María García", "email": "maria@test.com", "telefono": "+591 70111222", "diaNacimiento": 15, "mesNacimiento": 8 }
→ 201: { "id": "cl_001", "nombre": "María García", "estado": "ACTIVO" }

# 2. Buscar por nombre
GET /api/ventas/clientes?search=María
→ 200: { "data": [{ "id": "cl_001", "nombre": "María García", ... }], "meta": { "total": 1, ... } }

# 3. Intentar duplicado (mismo email)
POST /api/ventas/clientes
Body: { "nombre": "María García Otro", "email": "maria@test.com" }
→ 409: { "error": "ClienteEmailDuplicado" }

# 4. Desactivar cliente
PATCH /api/ventas/clientes/cl_001/estado
Body: { "estado": "INACTIVO" }
→ 200: { "id": "cl_001", "estado": "INACTIVO" }
```

**Resultado esperado**: Cliente creado, buscable, duplicado rechazado, estado cambiado.

---

## Escenario 2: Gestionar proveedores

```
# 1. Crear proveedor
POST /api/ventas/proveedores
Body: { "nombre": "Distribuidora ABC", "nit": "900123456-1", "departamento": "Cundinamarca", "productosOfrece": "Harinas, aceites" }
→ 201: { "id": "prov_001", "nombre": "Distribuidora ABC", "estado": "ACTIVO" }

# 2. Intentar NIT duplicado
POST /api/ventas/proveedores
Body: { "nombre": "Otro Distribuidor", "nit": "900123456-1" }
→ 409: { "error": "ProveedorNITDuplicado" }

# 3. Actualizar sitio web
PATCH /api/ventas/proveedores/prov_001
Body: { "sitioWeb": "https://distribuidora-abc.com" }
→ 200: { "id": "prov_001", "sitioWeb": "https://distribuidora-abc.com" }
```

---

## Escenario 3: Registrar compra en PENDIENTE

**Precondición**: proveedor prov_001 activo; producto prod_001 con variante var_001 (inventarioActivado=true, cantidadStock=10)

```
# 1. Crear compra con detalles y costo adicional
POST /api/ventas/compras
Body: {
  "proveedorId": "prov_001",
  "fecha": "2026-05-23T00:00:00.000Z",
  "descripcion": "Reposición mensual mayo",
  "detalles": [
    { "productoId": "prod_001", "varianteId": "var_001", "cantidad": 20, "precio": 5000, "precioEstimadoVenta": 8000 }
  ],
  "costosAdicionales": [
    { "motivo": "Flete", "costo": 3000 }
  ]
}
→ 201: {
  "id": "compra_001",
  "estado": "PENDIENTE",
  "totalCantidad": 20,
  "totalCompra": "100000.00",
  "totalCostoAdicional": "3000.00",
  "detalles": [...],
  "costosAdicionales": [...]
}

# 2. Verificar stock sin cambio
GET /api/almacen/variantes/var_001/stock
→ 200: { "cantidadStock": 10 }  ← sin cambio

# 3. Agregar otro detalle
POST /api/ventas/compras/compra_001/detalles
Body: { "productoId": "prod_002", "varianteId": "var_002", "cantidad": 5, "precio": 12000, "precioEstimadoVenta": 18000 }
→ 201: { "id": "det_002", ... }
```

---

## Escenario 4: Confirmar compra y verificar stock

```
# 1. Confirmar compra
POST /api/ventas/compras/compra_001/confirmar
→ 200: {
  "compra": { "id": "compra_001", "estado": "CONFIRMADA" },
  "advertencias": []
}

# 2. Verificar stock actualizado
GET /api/almacen/variantes/var_001/stock
→ 200: { "cantidadStock": 30 }  ← era 10, ahora 10+20=30

# 3. Intentar confirmar de nuevo
POST /api/ventas/compras/compra_001/confirmar
→ 422: { "error": "CompraYaConfirmadaError" }

# 4. Intentar eliminar compra confirmada
DELETE /api/ventas/compras/compra_001
→ 422: { "error": "CompraYaConfirmadaError" }
```

---

## Escenario 5: Confirmar con variante sin inventario activado

**Precondición**: compra con var_003 que tiene `inventarioActivado=false`

```
# Confirmar
POST /api/ventas/compras/compra_002/confirmar
→ 200: {
  "compra": { "estado": "CONFIRMADA" },
  "advertencias": [
    "Variante var_003 (Producto X) no tiene inventario activado — stock no actualizado"
  ]
}
# Las otras líneas SÍ incrementan stock; solo var_003 se omite
```

---

## Escenario 6: Intentar eliminar proveedor con compras

```
# 1. prov_001 ya tiene compra_001 (CONFIRMADA)
DELETE /api/ventas/proveedores/prov_001
→ 422: { "error": "ProveedorEnUsoError", "message": "El proveedor tiene compras registradas y no puede eliminarse" }
```

---

## Escenario 7: Tiempo real — verificar eventos

```
# Cliente A conectado a Socket.IO con token de tenant T1
# Cliente B conectado con mismo tenant T1

# Desde terminal 1 (usuario A): crear proveedor
POST /api/ventas/proveedores → 201

# Terminal 2 (usuario B) recibe sin recargar:
Socket event: "ventas:proveedor:creado" { tenantId: "T1", proveedorId: "...", nombre: "..." }

# Desde terminal 1: confirmar compra
POST /api/ventas/compras/compra_xxx/confirmar → 200

# Terminal 2 recibe:
Socket event: "ventas:compra:confirmada" { tenantId: "T1", compraId: "...", ... }
```
