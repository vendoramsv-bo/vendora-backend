# Socket.IO Events Contract: Catálogo Comercial

**Sala**: `tenant:{tenantId}` (todos los usuarios conectados del mismo tenant)
**Dirección**: Server → Client (broadcast)
**Origen**: Use cases del módulo `catalogo` vía puerto `ICatalogoNotificador`

---

## catalogo:actividad:creada

Emitido cuando un tenant activa una nueva actividad económica.

**Payload**:
```ts
{
  tenantId: string
  actividadId: string
  nombre: string
}
```

**Use case origen**: `CrearActividadUseCase`

---

## catalogo:categoria:creada

Emitido cuando se crea una nueva categoría.

**Payload**:
```ts
{
  tenantId: string
  categoriaId: string
  nombre: string
  padreId: string | null
  actividadId: string
}
```

**Use case origen**: `CrearCategoriaUseCase`

---

## catalogo:categoria:actualizada

Emitido cuando se modifica o cambia el estado de una categoría.

**Payload**:
```ts
{
  tenantId: string
  categoriaId: string
  nombre: string
  estado: string
}
```

**Use case origen**: `ActualizarCategoriaUseCase`, `CambiarEstadoCategoriaUseCase`

---

## catalogo:producto:creado

Emitido cuando se crea un nuevo producto.

**Payload**:
```ts
{
  tenantId: string
  productoId: string
  nombre: string
  categoriaId: string
  precio: string      // Decimal como string
  tipoProducto: string
}
```

**Use case origen**: `CrearProductoUseCase`

---

## catalogo:producto:actualizado

Emitido cuando se actualizan los datos de un producto (incluyendo cambio de precio).

**Payload**:
```ts
{
  tenantId: string
  productoId: string
  precio: string      // Decimal como string
}
```

**Use case origen**: `ActualizarProductoUseCase`

---

## catalogo:producto:estadoCambiado

Emitido cuando un producto cambia de estado (activo → inactivo, etc.).

**Payload**:
```ts
{
  tenantId: string
  productoId: string
  estado: string
}
```

**Use case origen**: `CambiarEstadoProductoUseCase`

---

## catalogo:oferta:creada

Emitido cuando se crea una oferta para un producto.

**Payload**:
```ts
{
  tenantId: string
  ofertaId: string
  productoId: string
  precioOferta: string   // Decimal como string
  fechaFin: string       // ISO 8601
}
```

**Use case origen**: `CrearOfertaUseCase`

---

## catalogo:oferta:actualizada

Emitido cuando se modifica o desactiva una oferta.

**Payload**:
```ts
{
  tenantId: string
  ofertaId: string
  productoId: string
  estado: string
}
```

**Use case origen**: `ActualizarOfertaUseCase`

---

## Aislamiento de tenant

Los eventos se emiten exclusivamente a la sala `tenant:{tenantId}`. Usuarios de otros tenants NO reciben estos eventos.

## Integración en ServerToClientEvents

Los tipos de estos eventos deben agregarse al contrato `ServerToClientEvents` cuando se publique el paquete de tipos compartidos (Artículo VIII.4):

```ts
interface ServerToClientEvents {
  // ... otros eventos existentes ...
  "catalogo:actividad:creada": (data: ActividadCreadaPayload) => void
  "catalogo:categoria:creada": (data: CategoriaCreadaPayload) => void
  "catalogo:categoria:actualizada": (data: CategoriaActualizadaPayload) => void
  "catalogo:producto:creado": (data: ProductoCreadoPayload) => void
  "catalogo:producto:actualizado": (data: ProductoActualizadoPayload) => void
  "catalogo:producto:estadoCambiado": (data: ProductoEstadoCambiadoPayload) => void
  "catalogo:oferta:creada": (data: OfertaCreadaPayload) => void
  "catalogo:oferta:actualizada": (data: OfertaActualizadaPayload) => void
}
```
