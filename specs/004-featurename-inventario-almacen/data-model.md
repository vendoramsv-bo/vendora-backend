# Data Model: Inventario y Almacén

**Feature**: 004-inventario-almacen
**Date**: 2026-05-22

---

## Schemas Involucrados

| Schema Prisma | Archivo | Rol |
|---------------|---------|-----|
| `catalogo` | `30-catalogo.prisma` | Stock de variantes (campos en `ProductoVariante`) |
| `almacen` | `40-almacen.prisma` | Movimientos, ajustes, recuentos, insumos, recetas |
| `ventas` | `50-ventas.prisma` | `Proveedor` (referenciado en ingresos) |

---

## Modificaciones al Schema Existente

### 1. `ProductoVariante` (catalogo) — agregar campos

```prisma
model ProductoVariante {
  // ...campos existentes...
  inventarioActivado  Boolean   @default(false)   // ← NUEVO: true tras inicialización explícita
  // cantidadStock e stockMinimo ya existen
}
```

**Razón**: Distinguir variantes nunca inicializadas en inventario de aquellas con stock explícito en 0.

### 2. `ProductoInsumo` (almacen) — agregar varianteId para recetas por variante

```prisma
model ProductoInsumo {
  id         String            @id @default(cuid())
  productoId String
  producto   Producto          @relation(...)
  varianteId String?           // ← NUEVO: null = receta del producto; presente = receta de variante
  variante   ProductoVariante? @relation(...) // ← NUEVO
  insumoId   String
  insumo     Insumo            @relation(...)
  cantidad   Decimal           @db.Decimal(10, 4)  // ← CAMBIO: Decimal para fracciones (kg, litros)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime?

  @@unique([productoId, varianteId, insumoId])  // ← CAMBIO: incluye varianteId
  @@schema("almacen")
}
```

**Razón**: Soportar recetas a nivel de variante con herencia del producto base.

### 3. `MovimientoInventario` (almacen) — agregar campos de historial

```prisma
model MovimientoInventario {
  // ...campos existentes...
  stockAntes   Int    @default(0)   // ← NUEVO: stock antes del movimiento
  stockDespues Int    @default(0)   // ← NUEVO: stock después del movimiento
  createdById  String?              // ← NUEVO: quién registró el movimiento
}
```

### 4. `MovimientoAlmacen` (almacen) — agregar campos de historial

```prisma
model MovimientoAlmacen {
  // ...campos existentes...
  stockAntes   Int    @default(0)   // ← NUEVO
  stockDespues Int    @default(0)   // ← NUEVO
  createdById  String?              // ← NUEVO
}
```

### 5. `AjusteDetalle` (almacen) — renombrar cantidadAjuste a cantidadAjuste y agregar stockDespues

```prisma
model AjusteDetalle {
  // ...campos existentes...
  stockDespues Int @default(0)  // ← NUEVO: resultado final del ajuste
}
```

---

## Entidades del Dominio (Módulo `almacen`)

### Inventario de Productos

#### `StockVariante` ← `ProductoVariante` (campos relevantes)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID de la variante |
| `productoId` | String | Producto al que pertenece |
| `cantidadStock` | Int | Stock actual |
| `stockMinimo` | Int | Stock mínimo de alerta |
| `inventarioActivado` | Boolean | True tras inicialización explícita |
| `estado` | Estado | Estado de la variante |

**Estado crítico**: `cantidadStock < stockMinimo AND inventarioActivado = true`

#### `MovimientoInventario` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID del movimiento |
| `tenantId` | String | Tenant |
| `productoId` | String | Producto afectado |
| `varianteId` | String? | Variante específica (null = producto base) |
| `tipo` | TipoMovimiento | CREACION, ENTRADA, SALIDA, AJUSTE, RECUENTO |
| `cantidad` | Int | Cantidad del movimiento (positiva o negativa) |
| `motivo` | String? | Motivo del movimiento |
| `referenciaId` | String? | ID del ajuste o recuento que lo originó |
| `stockAntes` | Int | Stock antes del movimiento ← NUEVO |
| `stockDespues` | Int | Stock después del movimiento ← NUEVO |
| `createdById` | String? | Responsable ← NUEVO |
| `createdAt` | DateTime | Fecha |

#### `AjusteInventario` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID del ajuste |
| `tenantId` | String | Tenant |
| `tenantMemberId` | String? | Responsable del ajuste |
| `fecha` | DateTime | Fecha del ajuste |
| `estado` | Estado | PENDIENTE → ACTIVO al confirmar |
| `motivo` | String? | Motivo del ajuste |
| `detalles` | AjusteDetalle[] | Líneas del ajuste |

#### `AjusteDetalle` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID de la línea |
| `ajusteId` | String | Ajuste al que pertenece |
| `productoId` | String | Producto ajustado |
| `varianteId` | String? | Variante específica |
| `stockAnterior` | Int | Stock antes del ajuste |
| `cantidadAjuste` | Int | Diferencia (positiva o negativa) |
| `stockDespues` | Int | Resultado final ← NUEVO |

#### `RecuentoInventario` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID del recuento |
| `tenantId` | String | Tenant |
| `tenantMemberId` | String? | Responsable |
| `fecha` | DateTime | Fecha del recuento |
| `estado` | Estado | PENDIENTE → ACTIVO al confirmar |
| `observacion` | String? | Observaciones |
| `detalles` | RecuentoDetalle[] | Líneas del recuento |

#### `RecuentoDetalle` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `recuentoId` | String | Recuento al que pertenece |
| `productoId` | String | Producto contado |
| `varianteId` | String? | Variante específica |
| `stockSistema` | Int | Stock registrado en sistema al momento del recuento |
| `stockFisico` | Int | Stock real contado físicamente |
| `diferencia` | Int | stockFisico - stockSistema |

---

### Almacén de Insumos

#### `Insumo` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID del insumo |
| `tenantId` | String | Tenant |
| `nombre` | String | Nombre del insumo |
| `unidadMedidaId` | String | FK a UnidadMedida del catálogo |
| `cantidadStock` | Int | Stock actual |
| `stockMinimo` | Int | Stock mínimo de alerta |
| `costoUnitario` | Decimal | Costo unitario |
| `fechaVencimiento` | DateTime? | Fecha de vencimiento |
| `estado` | Estado | ACTIVO / INACTIVO |

**Estado crítico**: `cantidadStock < stockMinimo`
**Estado vencido**: `fechaVencimiento < now()`

**Restricción**: No puede desactivarse ni eliminarse si aparece en una `ProductoInsumo` activa.

#### `MovimientoAlmacen` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID del movimiento |
| `tenantId` | String | Tenant |
| `insumoId` | String | Insumo afectado |
| `tipo` | TipoMovimientoAlmacen | CREACION, INGRESO, SALIDA, AJUSTE, RECUENTO |
| `cantidad` | Int | Cantidad (positiva o negativa) |
| `motivo` | String? | Motivo |
| `referenciaId` | String? | ID del ingreso, salida o recuento que originó el movimiento |
| `stockAntes` | Int | Stock antes ← NUEVO |
| `stockDespues` | Int | Stock después ← NUEVO |
| `createdById` | String? | Responsable ← NUEVO |
| `createdAt` | DateTime | Fecha |

#### `IngresoAlmacen` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID del ingreso |
| `tenantId` | String | Tenant |
| `tenantMemberId` | String? | Responsable |
| `fecha` | DateTime | Fecha del ingreso |
| `descripcion` | String? | Descripción |
| `proveedorId` | String | FK a Proveedor (schema ventas) |
| `estado` | Estado | PENDIENTE → ACTIVO al confirmar |
| `detalles` | IngresoDetalle[] | Líneas del ingreso |

#### `IngresoDetalle` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ingresoId` | String | Ingreso al que pertenece |
| `insumoId` | String | Insumo ingresado |
| `cantidad` | Int | Cantidad ingresada |
| `costoUnitario` | Decimal | Costo unitario de este ingreso |
| `lote` | String? | Número de lote |
| `fechaVencimiento` | DateTime? | Fecha de vencimiento de este lote |

#### `SalidaAlmacen` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID de la salida |
| `tenantId` | String | Tenant |
| `tenantMemberId` | String? | Responsable |
| `fecha` | DateTime | Fecha |
| `descripcion` | String? | Motivo/descripción |
| `estado` | Estado | PENDIENTE → ACTIVO al confirmar |
| `detalles` | SalidaDetalle[] | Insumos salientes |

#### `SalidaDetalle`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `salidaId` | String | Salida al que pertenece |
| `insumoId` | String | Insumo saliente |
| `cantidad` | Int | Cantidad |

#### `RecuentoAlmacen` ← schema `almacen`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID del recuento |
| `tenantId` | String | Tenant |
| `tenantMemberId` | String? | Responsable |
| `estado` | Estado | PENDIENTE → ACTIVO al confirmar |
| `observacion` | String? | Observaciones |
| `detalles` | RecuentoAlmacenDetalle[] | Líneas contadas |

#### `RecuentoAlmacenDetalle`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `recuentoId` | String | Recuento al que pertenece |
| `insumoId` | String | Insumo contado |
| `stockSistema` | Int | Stock en sistema al iniciar recuento |
| `stockFisico` | Int | Stock real contado |
| `diferencia` | Int | stockFisico - stockSistema |

---

### Recetas

#### `ProductoInsumo` ← schema `almacen` (extendido)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID de la línea de receta |
| `productoId` | String | Producto |
| `varianteId` | String? | null = receta nivel producto; presente = receta de variante |
| `insumoId` | String | Insumo componente |
| `cantidad` | Decimal | Cantidad por unidad de producto (ej. 0.1 kg) |

**Restricción de unicidad**: `(productoId, varianteId, insumoId)` única.

**Herencia de receta**: Al registrar consumo de varianteId X:
1. Buscar `ProductoInsumo` con `productoId = X.productoId AND varianteId = X.id` → receta de variante
2. Si no existe, buscar `ProductoInsumo` con `productoId = X.productoId AND varianteId = null` → receta del producto
3. Si tampoco existe, solo descontar stock de variante sin afectar insumos

---

## Diagrama de Relaciones Clave

```
ProductoVariante (catalogo)
├── inventarioActivado: Boolean    ← inicialización
├── cantidadStock: Int             ← stock actual
├── stockMinimo: Int               ← umbral de alerta
├── MovimientoInventario[] (almacen) ← historial de cambios
├── AjusteDetalle[] (almacen)     ← líneas de ajuste
└── RecuentoDetalle[] (almacen)   ← líneas de recuento

Insumo (almacen)
├── cantidadStock: Int             ← stock actual
├── stockMinimo: Int               ← umbral de alerta
├── MovimientoAlmacen[]           ← historial
├── ProductoInsumo[]              ← uso en recetas
├── IngresoDetalle[]              ← ingresos
└── SalidaDetalle[]               ← salidas

ProductoInsumo (almacen) — Receta
├── productoId
├── varianteId? (null = nivel producto)
└── insumoId + cantidad
```

---

## Estados y Transiciones

### Variante en Inventario
```
inventarioActivado = false → [inicializar] → inventarioActivado = true
                                              cantidadStock = stockInicial
                                              stockMinimo = configurado
```

### AjusteInventario / RecuentoInventario / IngresoAlmacen / SalidaAlmacen
```
PENDIENTE → [confirmar operador] → ACTIVO (stocks actualizados + movimientos creados)
```

### Insumo
```
ACTIVO → [desactivar, si no está en recetas activas] → INACTIVO
ACTIVO/INACTIVO → [eliminar, si no está en recetas activas] → eliminado
```
