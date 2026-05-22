# Data Model: Catálogo Comercial

**Schema PostgreSQL**: `catalogo`
**Archivo Prisma**: `prisma/30-catalogo.prisma`
**Nota**: Este modelo ya existe en el schema Prisma del proyecto. NO debe modificarse. Los repositorios y casos de uso deben adaptarse a él.

---

## Entidades principales

### ActividadEconomica
Registro que activa una actividad económica global para un tenant específico. Es la raíz de la jerarquía categoría → producto.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| tenantId | String | FK → Tenant |
| claActividadId | String | FK → ClaActividadEconomica (compartido) |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |
| createdById | String? | auditoría |
| updatedById | String? | auditoría |

**Constraints**: `@@unique([tenantId, claActividadId])` — un tenant no puede activar la misma actividad económica dos veces.

**Relaciones**: tiene muchas `Categoria[]` y `Producto[]`.

---

### UnidadMedida
Unidad de medida definida por el tenant (opcionalmente vinculada a un clasificador global).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| tenantId | String | FK → Tenant |
| unidad | String | nombre de la unidad |
| sigla | String | abreviatura |
| descripcion | String | descripción |
| claUnidadId | String? | FK → ClaUnidadMedida (opcional) |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |
| createdById | String? | auditoría |
| updatedById | String? | auditoría |

**Constraints**: `@@unique([tenantId, unidad])` — nombre único por tenant.

**Relaciones**: tiene muchos `Producto[]`.

---

### Categoria
Nodo del árbol de categorías de un tenant. Pertenece a una `ActividadEconomica` y opcionalmente tiene un padre.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| tenantId | String | FK → Tenant |
| actividadId | String | FK → ActividadEconomica |
| nivel | Int | default 1 (raíz); subniveles son 2, 3, … |
| nombre | String | — |
| descripcion | String? | — |
| imagenUrl | String? | URL de imagen |
| padreId | String? | FK → Categoria (auto-ref, null = raíz) |
| claCategoriaId | String? | FK → ClaCategoria (opcional, compartido) |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |
| createdById | String? | auditoría |
| updatedById | String? | auditoría |

**Constraints**: `@@unique([tenantId, actividadId, nombre])` — nombre único por actividad dentro del tenant (no por padre).

**Relaciones**: `padre?`, `hijos[]`, `productos[]`.

**Nota**: El campo `nivel` se calcula al crear: `nivel = padre.nivel + 1` si hay padre, `1` si es raíz.

---

### Producto
Entidad central del catálogo. Pertenece a una `Categoria` y `ActividadEconomica`.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| tenantId | String | FK → Tenant |
| actividadId | String | FK → ActividadEconomica |
| categoriaId | String | FK → Categoria |
| codigo | String | código único por (tenant, actividad, categoría) |
| nombre | String | nombre único por (tenant, actividad, categoría) |
| descripcion | String? | — |
| imagenUrl | String? | URL de imagen principal |
| unidadId | String | FK → UnidadMedida |
| tipoProducto | TipoDeProducto | COMERCIALIZACION \| SERVICIO \| PLATO \| BEBIDA \| POSTRE \| COMPLEMENTO |
| precio | Decimal(10,2) | precio base |
| cantidadStock | Int | stock informacional |
| stockMinimo | Int | alerta de stock mínimo |
| tipoDescuento | String | "SIN_DESCUENTO" default |
| porcentajeDescuento | Decimal(10,2) | — |
| montoDescuento | Decimal(10,2) | — |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |
| createdById | String? | auditoría |
| updatedById | String? | auditoría |

**Constraints**:
- `@@unique([tenantId, actividadId, categoriaId, codigo])` — código único en (tenant, actividad, categoría)
- `@@unique([tenantId, actividadId, categoriaId, nombre])` — nombre único en (tenant, actividad, categoría)

**Relaciones**: `categoria`, `actividadEconomica`, `unidadMedida`, `variantes[]`, `atributos[]`, `opcionesDelProducto[]`, `productosOfertas[]`, `preciosVolumen[]`, `preciosHistorico[]`, `imagenes[]`.

---

### ProductoPrecioHistorico
Registro inmutable de cada cambio en el precio base de un producto.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| productoId | String | FK → Producto |
| tenantId | String | para scoping de queries |
| precioAnterior | Decimal(10,2) | — |
| precioNuevo | Decimal(10,2) | — |
| createdAt | DateTime | fecha del cambio |

**Nota**: No tiene `createdById`/`updatedById` — es un log de auditoría (Artículo V.3).
**Nota**: Se crea automáticamente en `ActualizarProductoUseCase` cuando cambia `precio`.

---

### ProductoImagenes
Imágenes adicionales de un producto (el producto ya tiene `imagenUrl` para la imagen principal).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| productoId | String | FK → Producto |
| imagenUrl | String | URL de la imagen |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |

**Constraints**: `@@unique([productoId, imagenUrl])`.

---

### ProductoAtributo
Define una dimensión de variación para un producto (ej. "Color", "Talla").

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| productoId | String | FK → Producto |
| nombre | String | ej. "Color", "Talla" |
| tipo | TipoAtributo | TEXTO \| COLOR \| IMAGEN \| NUMERO |
| orden | Int | default 0 (para ordenamiento UI) |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |

**Constraints**: `@@unique([productoId, nombre])`.
**Relaciones**: `valores[]` (ProductoAtributoValor).

---

### ProductoAtributoValor
Valor concreto de un atributo (ej. "Rojo", "M").

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| atributoId | String | FK → ProductoAtributo |
| valor | String | ej. "Rojo", "M", "#FF0000" |
| hexColor | String? | código hex (cuando tipo=COLOR) |
| imagenUrl | String? | imagen representativa (cuando tipo=IMAGEN) |
| orden | Int | default 0 |
| createdAt | DateTime | auto |

**Constraints**: `@@unique([atributoId, valor])`.
**Relaciones**: `variantes[]` (vía ProductoVarianteAtributo).

---

### ProductoVariante
Combinación específica de valores de atributos para un producto, con su propio precio, stock e imagen.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| productoId | String | FK → Producto |
| sku | String? | código de la variante (único por producto) |
| precio | Decimal(10,2) | precio propio de la variante |
| cantidadStock | Int | default 0 |
| stockMinimo | Int | default 0 |
| imagenUrl | String? | imagen de la variante |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |

**Constraints**: `@@unique([productoId, sku])`.
**Relaciones**: `atributos[]` (vía ProductoVarianteAtributo), `ofertas[]`, `preciosVolumen[]`.

---

### ProductoVarianteAtributo
Tabla de unión: cada variante tiene N valores de atributos (uno por dimensión).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| varianteId | String | FK → ProductoVariante |
| atributoValorId | String | FK → ProductoAtributoValor |

**Constraints**: `@@unique([varianteId, atributoValorId])`.

---

### ProductoPrecioVolumen
Precio diferencial a partir de una cantidad mínima de unidades.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| productoId | String | FK → Producto |
| varianteId | String? | FK → ProductoVariante (opcional) |
| etiqueta | String | nombre descriptivo de la regla |
| cantidad | Int | cantidad mínima para aplicar el precio |
| precio | Decimal(10,2) | precio por unidad cuando se alcanza la cantidad |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |

**Constraints**: `@@unique([productoId, varianteId, cantidad])`.

---

### ProductoOpciones
Modificación u opción adicional seleccionable para un producto (ej. "Extra queso", "Sin cebolla").

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| productoId | String | FK → Producto |
| nombre | String | nombre de la opción |
| descripcion | String? | — |
| precio | Decimal(10,2) | precio extra (puede ser 0) |
| tipoDescuento | String | "SIN_DESCUENTO" default |
| porcentajeDescuento | Decimal(10,2) | — |
| montoDescuento | Decimal(10,2) | — |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |

**Constraints**: `@@unique([productoId, nombre])`.

---

### ProductoOfertas
Precio promocional vigente durante un período. Puede aplicar al producto base o a una variante específica.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| tenantId | String | FK → Tenant (para scoping) |
| productoId | String | FK → Producto |
| varianteId | String? | FK → ProductoVariante (null = aplica al producto base) |
| etiquetaVariante | String? | descripción textual de la variante (desnormalizado) |
| fechaInicio | DateTime | inicio de vigencia |
| fechaFin | DateTime | fin de vigencia |
| precioOferta | Decimal(10,2) | precio promocional |
| descuento | Decimal(10,2) | porcentaje o monto de descuento |
| estado | Estado | default ACTIVO |
| createdAt | DateTime | auto |
| updatedAt | DateTime? | auto |

**Constraints**: `@@unique([productoId, varianteId, fechaInicio, fechaFin])`.

**Vigencia**: Una oferta es "vigente" cuando `fechaInicio <= now AND fechaFin >= now AND estado = ACTIVO`.

---

## Enums

### TipoDeProducto (schema `catalogo`)
```
COMERCIALIZACION  // Producto físico de tienda
SERVICIO          // Servicio (consultorio, etc.)
PLATO             // Plato de restaurante
BEBIDA            // Bebida de restaurante
POSTRE            // Postre de restaurante
COMPLEMENTO       // Pan, salsas, aderezos, extras
```

### TipoAtributo (schema `catalogo`)
```
TEXTO   // Valor de texto libre
COLOR   // Código de color (con hexColor opcional)
IMAGEN  // Imagen representativa (con imagenUrl)
NUMERO  // Valor numérico
```

### Estado (schema `compartido`)
```
ACTIVO | INACTIVO | SUSPENDIDO | ELIMINADO | ...
```

---

## Clasificadores globales (schema `compartido`, solo lectura)

### ClaActividadEconomica
Catálogo global de actividades económicas disponibles para que los tenants activen.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String | PK |
| codigo | String | único global |
| nombre | String | — |
| imagenUrl | String? | — |

### ClaUnidadMedida
Catálogo global de unidades de medida estándar.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | String | PK |
| unidad | String | único |
| sigla | String | único |
| descripcion | String? | — |

---

## Diagrama de relaciones (simplificado)

```
ClaActividadEconomica (compartido)
  └── ActividadEconomica (catalogo) [tenantId]
        └── Categoria (catalogo) [padreId? → Categoria]
              └── Producto (catalogo)
                    ├── ProductoAtributo
                    │     └── ProductoAtributoValor
                    │           └── ProductoVarianteAtributo ─── ProductoVariante
                    │                                              ├── ProductoPrecioVolumen (opt)
                    │                                              └── ProductoOfertas (opt)
                    ├── ProductoOpciones
                    ├── ProductoPrecioVolumen
                    ├── ProductoOfertas
                    ├── ProductoPrecioHistorico
                    └── ProductoImagenes

UnidadMedida (catalogo) [tenantId] ──────────────── Producto
```
