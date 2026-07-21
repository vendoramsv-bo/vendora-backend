# Research: Estandarización de los Procesos BULK del Wizard de Tenant

## Contexto

`src/modules/tenant/adapters/wizard.rest.ts` expone 9 endpoints `POST .../bulk` (más el `PATCH /config` que sincroniza `PuntosDeVenta`) usados por los pasos de selección múltiple del wizard de creación de tenant. Se auditó el código actual de cada uno contra el estándar definido en `spec.md` (agregar lo nuevo + quitar lo deseleccionado + proteger elementos con datos dependientes) y se revisó el grafo de relaciones Prisma de cada entidad afectada para saber qué implica "eliminar" en cada caso.

## Inventario de endpoints BULK y estado actual

| Paso / Endpoint | Entidad | ¿Agrega lo nuevo? | ¿Quita lo deseleccionado? | ¿Protege datos dependientes? | GET de estado actual |
|---|---|---|---|---|---|
| `POST /actividades-economicas/bulk` | `ActividadEconomica` | ✅ | ✅ (incondicional) | ❌ | ✅ `GET /actividades-economicas` |
| `POST /catalogo/productos/bulk` | `Producto` (vía `AltaMasivaProductosUseCase`) | ✅ | ❌ **no quita nada** | N/A (no hay remove) | ✅ `GET /catalogo/productos-seleccionados` |
| `POST /catalogo/servicios/bulk` | `ServicioMedico` | ✅ (`createMany` + `skipDuplicates`) | ❌ **no quita nada** | N/A (no hay remove) | ❌ no existe |
| `POST /proveedores/bulk` | `Proveedor` | ✅ | ✅ (incondicional) | ❌ | ✅ `GET /proveedores` |
| `POST /turnos/bulk` | `TurnosDeAtencion` | ✅ | ✅ (incondicional) | ❌ | ✅ `GET /turnos` |
| `POST /seguros/bulk` | `Consultorio.contactoPublico.seguros` (JSON) | ✅ (reemplazo total) | ✅ (reemplazo total) | N/A (no hay FK, es un array de strings) | ❌ no expuesto en `GET /config` |
| `POST /especialidades/bulk` | `Consultorio.especialidades` (`String[]`) | ✅ (reemplazo total) | ✅ (reemplazo total) | N/A (no hay FK) | ❌ no expuesto en `GET /config` |
| `POST /categorias/bulk` | `Restaurante.contactoPublico.tiposCocina` (JSON) | ✅ (reemplazo total) | ✅ (reemplazo total) | N/A (no hay FK) | ❌ no expuesto en `GET /config` |
| `POST /zonas/bulk` | `Restaurante.contactoPublico.zonas` (JSON) | ✅ (reemplazo total) | ✅ (reemplazo total) | N/A (no hay FK; `Reserva.numeroMesa` es un string libre, sin relación) | ❌ no expuesto en `GET /config` |
| `PATCH /config` → `configuracion.cantidadPuntosDeVenta` | `PuntosDeVenta` | ✅ | ✅ (protegido) | ✅ **referencia/estándar ya construido** | ✅ `GET /puntos-de-venta` |

**Conclusión clave**: el patrón de referencia (crear lo que falta + eliminar solo lo que no tiene datos dependientes) hoy **solo existe para Puntos de Venta**. Ningún otro endpoint lo implementa todavía. Además, 2 de los 3 endpoints que ya hacen "quitar lo deseleccionado" (`actividades-economicas/bulk`, `turnos/bulk`) lo hacen **sin ninguna protección**, y eso ya es un problema de pérdida de datos activo, no solo de estilo — ver siguiente sección.

## Hallazgo de severidad: dos endpoints ya en producción borran historial real

Se revisó el `onDelete` de cada relación relevante en `prisma/*.prisma`:

- **`ActividadEconomica` → `Categoria[]` y `Producto[]`**: ambas relaciones tienen `onDelete: Cascade`. Y `Producto` a su vez tiene `onDelete: Cascade` hacia `VentaDetalle`, `MovimientoInventario`, `ProductoDestacado`, etc. **Hoy, si un propietario deselecciona una actividad económica que ya tiene productos con ventas reales, `actividadEconomica.deleteMany(...)` cascadea silenciosamente y borra esos productos y sus ventas.**
- **`TurnosDeAtencion` → `Venta[]` y `AperturaCierreDeCaja[]`**: ambas con `onDelete: Cascade` (el mismo patrón que ya se protegió para `PuntosDeVenta`, pero aquí sin protección). **Hoy, deseleccionar un turno con ventas ya registradas borra esas ventas.**
- **`Proveedor` → `Compra[]` e `IngresoAlmacen[]`**: sin `onDelete` explícito → Postgres usa `NO ACTION` (bloquea el `DELETE`). **Hoy, deseleccionar un proveedor con compras registradas hace que la transacción completa falle** (ni siquiera se guardan los proveedores nuevos agregados en el mismo envío, porque todo el `$transaction` revierte).
- **`ServicioMedico` → `AtencionDetalle[]`**: `onDelete: Restrict` (bloquea). `→ Cita[]`: `onDelete: SetNull` (no bloquea, pero huérfana la referencia histórica). Como hoy `servicios/bulk` no borra nada, este riesgo todavía no se manifiesta — pero se activa en cuanto se implemente FR-003 sin FR-004.
- **`Producto`**: múltiples relaciones `onDelete: Cascade` (`ventasDetalle`, `movimientosInventario`, `productosDestacados`, `productosOfertas`, reacciones sociales) y una `onDelete: Restrict` (`ReservaDetalle.productoId`, en restaurante). Es la entidad con mayor "radio de explosión" — confirma por qué el bug reportado (Productos) es el más visible: aunque hoy `productos/bulk` no borra nada (por eso el usuario ve productos "fantasma"), el día que se implemente el borrado sin protección, sería el endpoint más peligroso de los nueve.

**Implicación para el diseño**: FR-003 (quitar lo deseleccionado) y FR-004 (proteger lo que tiene datos dependientes) no pueden implementarse por separado ni en momentos distintos — deben entrar juntos por endpoint, exactamente como ya se hizo para Puntos de Venta. Priorizar el orden de implementación por severidad real:
1. `turnos/bulk` y `actividades-economicas/bulk` — **corregir la pérdida de datos activa** (agregar protección a un `deleteMany` que hoy ya se ejecuta).
2. `proveedores/bulk` — corregir el 500 que ya puede ocurrir hoy.
3. `catalogo/productos/bulk`, `catalogo/servicios/bulk` — agregar el `remove` que falta, con protección desde el día uno.
4. `seguros/bulk`, `especialidades/bulk`, `categorias/bulk`, `zonas/bulk` — sin cambios de lógica (ya son reemplazo total sin riesgo de FK), solo falta exponer su estado vía `GET` (FR-007).

## Decisión: qué cuenta como "datos dependientes" por entidad

| Entidad | Señal de "en uso" (no eliminar) | Justificación |
|---|---|---|
| `ActividadEconomica` | Tiene al menos un `Producto` con historial real (`VentaDetalle` asociado) | Evita perder ventas ya registradas; los productos sin ventas todavía pueden cascadear junto con la actividad |
| `Producto` | Tiene al menos un `VentaDetalle`, `MovimientoInventario` o `ReservaDetalle` asociado | Es el caso reportado explícitamente; refleja uso operativo real, no metadatos del propio catálogo (ofertas, destacados) |
| `ServicioMedico` | Tiene al menos una `Cita` o `AtencionDetalle` asociada | Historial clínico real |
| `Proveedor` | Tiene al menos una `Compra` o `IngresoAlmacen` asociada | Historial de abastecimiento real |
| `TurnosDeAtencion` | Tiene al menos una `Venta` o `AperturaCierreDeCaja` asociada | Mismo criterio ya implementado para `PuntosDeVenta` |
| `seguros` / `especialidades` / `tiposCocina` / `zonas` | N/A — son arrays/JSON sin fila propia ni FK | El reemplazo total del array ya es seguro; no aplica protección |

**Decisión**: **Opción A (Eliminación protegida)**, confirmada por el usuario en `spec.md` — un elemento con datos dependientes se conserva sin cambios; uno sin ellos se elimina normalmente. Es el mismo criterio ya construido para `PuntosDeVenta` (`ventas: { none: {} }, aperturasCierresDeCaja: { none: {} } }`), extendido entidad por entidad según su propia tabla de relaciones "en uso".

## Alternativas consideradas y descartadas

- **Baja lógica (desactivar en vez de borrar) para todos los casos**: descartada por decisión del usuario — agrega un estado adicional (`estado = INACTIVO`) a mantener y filtrar en cada entidad afectada, más trabajo que el precedente ya construido, sin beneficio claro sobre "conservar tal cual".
- **Eliminación incondicional en todos los casos**: descartada — es exactamente el patrón que hoy ya causa la pérdida de datos activa descrita arriba en `actividades-economicas/bulk` y `turnos/bulk`; estandarizar hacia esa opción sería propagar el bug, no corregirlo.
- **Un helper 100% genérico de "sync" reutilizado por los 9 endpoints**: descartado — las entidades difieren demasiado en forma (algunas son tablas relacionales con catálogo global `Cla*`, otras son nombres libres, otras son arrays JSON embebidos en otro modelo) y en qué cuenta como "dependiente". Forzar una abstracción única generaría una interfaz genérica con muchos parámetros opcionales, más difícil de entender que repetir el patrón (ya establecido en el propio archivo) de: `existentes` → `paraAgregar`/`paraEliminar` → filtrar protegidos → `$transaction`. Se mantiene el estilo ya usado en `wizard.rest.ts`, consistente con el resto del archivo (Artículo IX.4 de la constitución ya se aparta de la arquitectura hexagonal estricta en todo este adaptador — ver `Complexity Tracking` en `plan.md`).

## Exposición de estado actual (FR-007)

Pasos sin forma de consultar su selección guardada hoy: `servicios médicos`, `seguros`, `especialidades`, `tipos de cocina`, `zonas`. Se requiere:
- Un nuevo `GET /catalogo/servicios-seleccionados` (mismo patrón que `GET /catalogo/productos-seleccionados`).
- Extender `GET /config` para incluir, cuando aplique según el tipo de negocio, los campos ya guardados: `consultorio.contactoPublico.seguros`, `consultorio.especialidades`, `restaurante.contactoPublico.tiposCocina`, `restaurante.contactoPublico.zonas`.
