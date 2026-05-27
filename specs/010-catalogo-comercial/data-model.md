# Data Model: Catálogo Comercial — Capacidades Faltantes

**Feature**: 010-catalogo-comercial  
**Date**: 2026-05-26

> **Nota**: Este data model documenta únicamente los **cambios incrementales** al modelo existente.
> El schema completo está en `prisma/30-catalogo.prisma`. No se modifican archivos Prisma — el schema ya tiene todos los modelos necesarios.

---

## Modelos existentes — sin cambio en schema

Todos los modelos del schema `catalogo` ya están migrados:
`Producto`, `Categoria`, `ActividadEconomica`, `UnidadMedida`, `ProductoVariante`,
`ProductoAtributo`, `ProductoAtributoValor`, `ProductoVarianteAtributo`,
`ProductoPrecioVolumen`, `ProductoOfertas`, `ProductoOpciones`,
`ProductoPrecioHistorico`, `ProductoImagenes`

---

## Cambios en la capa de aplicación (sin migración de BD)

### 1. ProductoCreateDTO — campo `tipoDescuento` agregado

```typescript
// En src/modules/catalogo/domain/ports/IProductoRepository.ts
export interface ProductoCreateDTO {
  actividadId: string
  categoriaId: string
  unidadId: string
  codigo: string
  nombre: string
  descripcion?: string
  imagenUrl?: string
  tipoProducto?: string
  precio?: number
  cantidadStock?: number      // stock inicial
  stockMinimo?: number
  tipoDescuento?: string      // ← AGREGADO: "SIN_DESCUENTO" | "PORCENTAJE" | "MONTO_FIJO"
  porcentajeDescuento?: number
  montoDescuento?: number
}

export interface ProductoUpdateDTO {
  nombre?: string
  descripcion?: string
  imagenUrl?: string
  tipoProducto?: string
  precio?: number
  cantidadStock?: number      // ← protegido por ProductoConMovimientos
  stockMinimo?: number
  unidadId?: string
  categoriaId?: string
  tipoDescuento?: string      // ← AGREGADO
  porcentajeDescuento?: number
  montoDescuento?: number
}
```

### 2. Nuevos métodos en IProductoRepository

```typescript
// Verificación
verificarCodigo(tenantId: string, codigo: string): Promise<{ existe: boolean; producto?: { id: string; nombre: string; codigo: string } }>

// Eliminación (hard delete con cleanup previo de movimiento CREACION)
eliminar(id: string, tenantId: string): Promise<void>

// Integración con MovimientoInventario (cross-schema, almacen)
registrarMovimientoCreacion(productoId: string, tenantId: string, cantidadStock: number, userId: string): Promise<void>
eliminarMovimientoCreacion(productoId: string, tenantId: string): Promise<void>
tieneMovimientosReales(productoId: string): Promise<boolean>   // true si existen movimientos tipo != CREACION

// Variantes cartesianas
generarPropuestaVariantes(
  productoId: string,
  tenantId: string
): Promise<Array<{ etiqueta: string; valoresIds: string[]; combinacion: Array<{ atributo: string; valor: string }> }>>

confirmarVariantes(
  productoId: string,
  variantes: Array<{ valoresIds: string[]; precio?: number; cantidadStock?: number; imagenUrl?: string }>
): Promise<unknown[]>

// Alta masiva
altaMasiva(
  claProductoIds: string[],
  tenantId: string,
  userId: string
): Promise<{ creados: ProductoEntity[]; noEncontrados: string[] }>
```

### 3. Nuevos errores de dominio en catalogo.errors.ts

```typescript
export class ProductoConMovimientos extends Error {
  readonly code = "PRODUCTO_CON_MOVIMIENTOS"
  // El stock inicial no puede modificarse — el producto ya tiene movimientos reales
}

export class AltaMasivaVacia extends Error {
  readonly code = "ALTA_MASIVA_VACIA"
  // Se requiere al menos una plantilla del catálogo maestro
}

export class ClaProductoNoEncontrado extends Error {
  readonly code = "CLA_PRODUCTO_NO_ENCONTRADO"
  // ids: string[] — los IDs de plantillas que no existen
  constructor(public readonly ids: string[]) { ... }
}
```

---

## Modelos de referencia en otros schemas (solo lectura)

### ClaProducto (schema `compartido`)
```
id             String   @id
claActividadId String   → ClaActividadEconomica
claCategoriaId String   → ClaCategoria
claUnidadId    String   → ClaUnidadMedida
codigo         String
nombre         String
descripcion    String?
imagenUrl      String?
tipoProducto   TipoDeProducto
precio         Decimal
```

### MovimientoInventario (schema `almacen`)
```
id          String
tenantId    String
productoId  String
varianteId  String?
tipo        TipoMovimiento   ← "CREACION" | "ENTRADA" | "SALIDA" | "AJUSTE" | "RECUENTO"
cantidad    Int
stockAntes  Int
stockDespues Int
createdById String?
createdAt   DateTime

@@unique([tenantId, productoId, varianteId, tipo, referenciaId])
```

---

## Enums (existentes, sin cambio)

### TipoDeProducto (schema `catalogo`)
```
COMERCIALIZACION | SERVICIO | PLATO | BEBIDA | POSTRE | COMPLEMENTO
```

### TipoDescuento (valores de string, no enum DB)
```
SIN_DESCUENTO | PORCENTAJE | MONTO_FIJO
```
> El campo `tipoDescuento` en la BD es `String` (no enum Prisma). La validación del dominio de valores se hace con Zod en el adaptador.

### TipoMovimiento (schema `almacen`)
```
CREACION | ENTRADA | SALIDA | AJUSTE | RECUENTO
```

---

## Diagrama de relaciones — Flujos nuevos

```
Producto (catalogo)
  │── crea ──→ MovimientoInventario.tipo=CREACION (almacen) [al crear COMERCIALIZACION]
  │── elimina → MovimientoInventario.tipo=CREACION (almacen) [antes de hard delete]
  │── propone → CartesianoVariantes (en memoria) [generar-propuesta]
  │── confirma → ProductoVariante[] (catalogo) [batch create]
  
ClaProducto (compartido)
  │── alta-masiva → Producto[] (catalogo) [1 Producto por ClaProducto seleccionado]
  │── auto-crea → Categoria (si no existe en tenant)
  └── auto-crea → UnidadMedida (si no existe en tenant)
```
