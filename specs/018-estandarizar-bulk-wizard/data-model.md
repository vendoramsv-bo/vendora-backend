# Data Model: Estandarización de los Procesos BULK del Wizard de Tenant

No se agregan modelos ni columnas nuevas. Esta funcionalidad estandariza el **comportamiento de sincronización** sobre entidades Prisma ya existentes. Este documento describe, por entidad afectada, el criterio de "selección" y el criterio de "dato dependiente" que activa la protección definida en `spec.md` (FR-004).

## Concepto transversal: Selección de paso BULK

Cada paso BULK del wizard recibe un conjunto de identificadores (`ids`, o `zonas` en el caso de Restaurante) que representa la selección **completa y definitiva** del propietario para ese paso en el momento del envío. El comportamiento estándar, aplicado por endpoint según su tabla correspondiente:

```
existentes := elementos ya guardados para el tenant en este paso
seleccion  := ids recibidos en el body

paraAgregar  := seleccion - existentes
paraEliminar := existentes - seleccion

eliminables  := paraEliminar SIN los elementos que tienen datos dependientes (ver tabla por entidad)
protegidos   := paraEliminar CON los elementos que tienen datos dependientes (se conservan tal cual)

transacción:
  crear(paraAgregar)
  eliminar(eliminables)
```

`protegidos` no genera error — el elemento simplemente permanece en `existentes` después del envío, igual que hoy ocurre con `PuntosDeVenta`.

## Entidades afectadas

### ActividadEconomica (`@@schema("catalogo")`) — sin cambios estructurales

```
ActividadEconomica {
  id              String
  tenantId        String
  claActividadId  String   // identidad de selección: coincide con el catálogo global ClaActividadEconomica
  estado          Estado   @default(ACTIVO)
  categoria       Categoria[]   // onDelete: Cascade
  producto        Producto[]    // onDelete: Cascade
}
```
- **Identidad de selección**: `claActividadId`.
- **Dato dependiente**: al menos un `Producto` asociado con `VentaDetalle` (ventas reales).
- **Endpoint**: `POST /actividades-economicas/bulk` — ya implementa agregar/quitar; falta agregar la protección.

### Producto (`@@schema("catalogo")`) — sin cambios estructurales

- **Identidad de selección** (paso wizard): `claProductoId` del catálogo global `ClaProducto`, resuelto por `codigo` + `claActividadId` (ver `GET /catalogo/productos-seleccionados` ya existente).
- **Dato dependiente**: al menos un `VentaDetalle`, `MovimientoInventario`, o `ReservaDetalle` asociado (relaciones `ventasDetalle`, `movimientosInventario`, `reservaDetalles` en el modelo `Producto`).
- **Endpoint**: `POST /catalogo/productos/bulk` — hoy solo agrega (`AltaMasivaProductosUseCase`); falta el `remove` completo con protección. Es el caso reportado en la spec (User Story 1).

### ServicioMedico (`@@schema("consultorio")`) — sin cambios estructurales

```
ServicioMedico {
  id             String
  consultorioId  String
  nombre         String   // identidad de selección (no hay catálogo global; @@unique([consultorioId, nombre]))
  citas             Cita[]             // onDelete: SetNull
  atencionesDetalle AtencionDetalle[]  // onDelete: Restrict
}
```
- **Identidad de selección**: `nombre` (el wizard no usa un catálogo `Cla*` para servicios; el usuario escribe/elige nombres libres).
- **Dato dependiente**: al menos una `Cita` o `AtencionDetalle` asociada.
- **Endpoint**: `POST /catalogo/servicios/bulk` — hoy solo agrega (`createMany` + `skipDuplicates`); falta el `remove` completo con protección, y falta un `GET` de estado actual.

### Proveedor (`@@schema("ventas")`) — sin cambios estructurales

- **Identidad de selección**: `claProveedorId` del catálogo global `ClaProveedor`.
- **Dato dependiente**: al menos una `Compra` o `IngresoAlmacen` asociada.
- **Endpoint**: `POST /proveedores/bulk` — ya implementa agregar/quitar; falta la protección (hoy puede romper la transacción completa por FK `NO ACTION`, ver `research.md`).

### TurnosDeAtencion (`@@schema("ventas")`) — sin cambios estructurales

- **Identidad de selección**: `claTurnoId` del catálogo global `ClaTurnosDeAtencion`.
- **Dato dependiente**: al menos una `Venta` o `AperturaCierreDeCaja` asociada — **mismo criterio ya implementado para `PuntosDeVenta`**.
- **Endpoint**: `POST /turnos/bulk` — ya implementa agregar/quitar; falta la protección (hoy cascada y borra ventas reales, ver `research.md`).

### PuntosDeVenta (`@@schema("ventas")`) — referencia, sin cambios

Ya implementa el patrón completo (crear lo que falta + eliminar solo lo no-dependiente) en `PATCH /api/tenant/config` → `configuracion.cantidadPuntosDeVenta`. Sirve como plantilla de implementación para el resto.

### Consultorio.especialidades / Consultorio.contactoPublico.seguros — sin cambios estructurales

- Arrays sin fila propia ni FK — el reemplazo total del array en cada envío ya es el comportamiento estándar (agrega y quita en el mismo `update`). No requiere protección.
- **Gap**: no expuestos en `GET /config` (FR-007) — se debe agregar su lectura.

### Restaurante.contactoPublico.tiposCocina / .zonas — sin cambios estructurales

- Mismo caso que arriba: arrays/JSON sin FK, reemplazo total ya es seguro. `Reserva.numeroMesa` es un campo `String?` libre, sin relación hacia `zonas`, así que no hay dato dependiente que proteger.
- **Gap**: no expuestos en `GET /config` (FR-007).

## Resumen de cambios requeridos por entidad

| Entidad | Agregar `remove` | Agregar protección | Agregar `GET` de estado |
|---|---|---|---|
| ActividadEconomica | — (ya existe) | ✅ nuevo | — (ya existe) |
| Producto | ✅ nuevo | ✅ nuevo | — (ya existe) |
| ServicioMedico | ✅ nuevo | ✅ nuevo | ✅ nuevo |
| Proveedor | — (ya existe) | ✅ nuevo | — (ya existe) |
| TurnosDeAtencion | — (ya existe) | ✅ nuevo | — (ya existe) |
| seguros / especialidades / tiposCocina / zonas | — (ya son reemplazo total) | N/A | ✅ nuevo (extender `GET /config`) |
