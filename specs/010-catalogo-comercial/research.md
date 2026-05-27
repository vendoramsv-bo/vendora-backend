# Research: Catálogo Comercial — Capacidades Faltantes

**Feature**: 010-catalogo-comercial  
**Date**: 2026-05-26

---

## Decision 1: Integración con MovimientoInventario — acceso directo a tabla

**Decision**: El módulo `catalogo` escribe y elimina registros de `MovimientoInventario` directamente usando `prismaBase as any` (cross-schema), sin pasar por el módulo `almacen`.

**Rationale**: Este es el patrón establecido en el proyecto para acceso cross-schema (ver módulo `social` accediendo a `catalogo.Producto`, módulo `restaurante` accediendo a `catalogo.Producto`). Importar un servicio del módulo `almacen` crearía una dependencia circular (vertical → núcleo ← vertical), violando la regla de que el núcleo no depende de verticales (Artículo II.1). El módulo `almacen` tampoco exporta un use case público para registro de stock inicial.

**Alternatives considered**:
- Llamar al servicio de inventario: descartado por dependencia circular potencial y acoplamiento entre módulos del núcleo
- Evento de dominio + manejador: sobre-ingeniería para una operación atómica simple

**Implementation**:
```typescript
// En ProductoPrismaRepository
async registrarMovimientoCreacion(productoId, tenantId, cantidadStock, userId) {
  const db = prismaBase as any
  return db.movimientoInventario.create({
    data: {
      tenantId,
      productoId,
      tipo: "CREACION",
      cantidad: cantidadStock,
      stockAntes: 0,
      stockDespues: cantidadStock,
      createdById: userId,
    }
  })
}
```

**Key constraint**: El unique constraint en `MovimientoInventario` es `[tenantId, productoId, varianteId, tipo, referenciaId]`. Con `varianteId=null` y `referenciaId=null`, solo puede existir UN movimiento de tipo CREACION por producto — garantía de integridad.

---

## Decision 2: Verificación de código — consulta dedicada vs constraint DB

**Decision**: Agregar un método `verificarCodigo(tenantId, codigo)` en `IProductoRepository` que devuelve `{ existe: boolean, producto?: { id, nombre, codigo } }`. Esto es un `findFirst` simple con los campos de respuesta.

**Rationale**: El spec requiere explícitamente un endpoint de pre-verificación (FR-001) que el cliente puede llamar antes de mostrar el formulario de creación. La implementación actual lanza un error 500/400 en el DB unique constraint — no es un flujo UX amigable. El endpoint es también útil para validación en tiempo real mientras el usuario tipea el código.

**Alternatives considered**:
- Solo confiar en el error de DB: descartado (UX deficiente, el spec lo pide explícitamente)
- Verificar al crear y devolver error amigable: ya existe, pero el spec pide un endpoint de pre-check independiente

---

## Decision 3: Generación cartesiana de variantes — endpoint de propuesta + endpoint de confirmación

**Decision**: Implementar en dos pasos:
1. `POST /productos/:id/variantes/generar-propuesta` — recibe lista de `atributoIds[]`, devuelve el cartesiano calculado SIN persistir. El cliente puede presentarlo al usuario para review.
2. `POST /productos/:id/variantes/confirmar` — recibe el subconjunto seleccionado de combinaciones y las persiste todas de una vez (batch create).

**Rationale**: El spec clarifica que la generación es híbrida — el sistema propone, el usuario elimina no deseadas, y luego confirma. Dos endpoints distintos mantienen la separación entre cálculo y persistencia, y permite que el frontend implemente el flujo de review sin persistir datos temporales en la BD.

**Alternatives considered**:
- Un solo endpoint que genera + persiste: no permite review previo sin persistir
- Guardar propuesta en sesión/cache: complejidad innecesaria
- Persiste todas y el usuario elimina: genera registros huérfanos

**Cartesian generation algorithm**:
```typescript
function cartesianoAtributos(atributos: Array<{ nombre: string, valores: string[] }>): string[][] {
  return atributos.reduce<string[][]>(
    (acc, attr) => acc.flatMap(combo => attr.valores.map(v => [...combo, v])),
    [[]]
  )
}
```

---

## Decision 4: Alta masiva — operación atómica con rollback

**Decision**: La alta masiva ejecuta todo dentro de una transacción Prisma. Si alguna plantilla no existe, la transacción hace rollback completo y devuelve los IDs no encontrados. Las categorías y unidades de medida faltantes se crean dentro de la misma transacción.

**Rationale**: El spec (FR-019) requiere que la operación sea atómica — "falla completamente (sin crear ningún producto)". Usar `prisma.$transaction()` garantiza esto. La creación auto-creada de categorías y unidades sigue el mismo patrón que el alta masiva de la vertical (reutiliza el `ICategoriaRepository` y `IUnidadMedidaRepository` existentes).

**Alternatives considered**:
- Procesar cada plantilla individualmente (best-effort): descartado por el requisito de atomicidad
- Saga pattern: sobre-ingeniería para una operación síncrona de bajo volumen

**ClaProducto → Producto mapping**:
```
ClaProducto.codigo           → Producto.codigo
ClaProducto.nombre           → Producto.nombre
ClaProducto.descripcion      → Producto.descripcion (opcional)
ClaProducto.imagenUrl        → Producto.imagenUrl (opcional)
ClaProducto.tipoProducto     → Producto.tipoProducto
ClaProducto.precio           → Producto.precio
ClaProducto.claUnidadId      → Resuelve UnidadMedida del tenant (crea si no existe)
ClaProducto.claActividadId   → Resuelve ActividadEconomica del tenant
ClaProducto.claCategoriaId   → Resuelve Categoria del tenant (crea si no existe)
                             → Producto.cantidadStock = 0 (hardcoded por spec)
                             → Producto.tipoDescuento = "SIN_DESCUENTO" (default)
```

---

## Decision 5: Protección de stock inicial — check en repositorio

**Decision**: Al actualizar `cantidadStock` en un producto, el repositorio verifica si existen movimientos de inventario distintos al tipo CREACION. Si existen, lanza `ProductoConMovimientos`. Esta verificación se hace en el repositorio, no en el use case, porque requiere acceso cross-schema.

**Rationale**: La verificación de existencia de movimientos no puede hacerse en el dominio puro (accede a tablas del schema `almacen`). El repositorio es el lugar correcto para este check cross-schema, devolviendo un error de dominio que el dominio sí conoce.

**Query**:
```typescript
const count = await db.movimientoInventario.count({
  where: { productoId, tipo: { not: "CREACION" } }
})
if (count > 0) throw new ProductoConMovimientos(productoId)
```

---

## Decision 6: tipoDescuento — campo obligatorio en create/update DTO

**Decision**: Agregar `tipoDescuento: string` en `ProductoCreateDTO` y `tipoDescuento?: string` en `ProductoUpdateDTO`. Validar con enum Zod: `z.enum(["SIN_DESCUENTO", "PORCENTAJE", "MONTO_FIJO"])`. El campo ya existe en la BD (`Producto.tipoDescuento String @default("SIN_DESCUENTO")`), solo falta propagarlo por las capas de aplicación.

**Rationale**: El spec lo establece como campo obligatorio (FR-002). El campo ya existe en el modelo Prisma pero no está en el DTO de creación — es un gap de implementación.

---

## Decision 7: Eliminación de producto — soft vs hard delete

**Decision**: Hard delete (`prisma.producto.delete`). Prisma maneja la cascada definida en el schema: `onDelete: Cascade` para `ProductoOfertas`, `ProductoOpciones`, `ProductoAtributo`, `ProductoVariante`, `ProductoPrecioVolumen`, `ProductoPrecioHistorico`, `ProductoImagenes`. El movimiento CREACION se elimina explícitamente antes (cross-schema, no tiene cascade automático).

**Rationale**: El schema ya define `onDelete: Cascade` para las relaciones dentro del schema `catalogo`. La única relación que requiere eliminación manual explícita es `MovimientoInventario` (schema `almacen`, sin cascade cross-schema). Las referencias en otros módulos (VentaDetalle, CompraDetalle, etc.) tienen `onDelete: SetNull` o `Cascade` según corresponda.

**Order of operations in use case**:
```
1. Verificar que el producto existe y pertenece al tenant
2. Verificar permisos (PROPIETARIO | ADMIN)
3. repo.eliminarMovimientoCreacion(productoId, tenantId)  ← cross-schema manual
4. repo.eliminar(productoId, tenantId)                    ← cascade automático por Prisma
5. notificador.productoEliminado(tenantId, { productoId })
```
