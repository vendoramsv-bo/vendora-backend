# Research: TuRestaurante — Perfil Público de Restaurante

## Decision 1: Placement del módulo — ¿nuevo módulo o extender `restaurante`?

**Decision**: Extender el módulo `restaurante` existente con nuevos subdominios públicos.

**Rationale**: La constitución (Art. II) lista `restaurante` como la vertical completa. A diferencia de TuTienda (donde `tienda` es un módulo separado porque las operaciones internas viven en `catalogo`, `ventas` y `almacen`), el módulo `restaurante` ya es la vertical y contiene toda la lógica interna. Agregar subdominios `perfil-publico`, `directorio-publico`, `menu-publico` y `reserva-publica` dentro del módulo `restaurante` es la extensión natural sin crear redundancia de nombres.

**Alternatives considered**:
- Nuevo módulo `tu-restaurante`: Descartado — la constitución no declara este módulo y generaría duplicidad de nombre vertical.
- Subdominios en el módulo `tienda`: Descartado — contexto incorrecto, nada que ver con retail.

---

## Decision 2: Modelos sociales — modelos concretos (como TuTienda) vs. polimorfismo

**Decision**: Modelos concretos para cada entidad de interacción social del restaurante, siguiendo el patrón de TuTienda.

**Rationale**: El schema `80-social.prisma` ya contiene `TiendaReaccion`, `TiendaComentario`, `TiendaValoracion`, `TiendaPregunta`, `TiendaFavorito`, `TiendaSeguidor` como modelos Prisma concretos vinculados directamente a la entidad `Tienda`. Replicar este patrón para `Restaurante` mantiene consistencia arquitectónica, tipado fuerte en Prisma, y evita queries polimórficas complejas con discriminadores de tipo.

**Alternatives considered**:
- Tabla polimórfica única con campo `referenciaTipo`: Descartado — rompe tipado Prisma, añade complejidad de queries, introduce riesgo de contaminación cross-tenant no obvia.
- Reutilizar modelos Tienda con campo discriminador: Descartado — viola el principio de aislamiento multi-vertical.

---

## Decision 3: Estado de preguntas — nuevo enum vs. reutilizar `Estado`

**Decision**: Reutilizar el enum `Estado` existente: `ACTIVO` = VISIBLE, `INACTIVO` = OCULTA.

**Rationale**: TiendaPregunta usa `Estado @default(ACTIVO)` con el mismo semántica. Crear un nuevo enum `EstadoPreguntaRestaurante` con VISIBLE/OCULTA no añade valor sobre el enum compartido ya establecido. La capa de aplicación traduce la semántica de negocio (VISIBLE/OCULTA) al enum técnico (ACTIVO/INACTIVO).

---

## Decision 4: Ampliación de `EstadoReserva` para reservas públicas

**Decision**: Agregar `PENDIENTE` y `CANCELADA_CLIENTE` al enum `EstadoReserva`.

**Rationale**: Las reservas creadas desde el perfil público inician en `PENDIENTE` (awaiting staff review), un estado diferente a `RESERVADA` (reserva confirmada por el staff). La cancelación por parte del consumidor online requiere `CANCELADA_CLIENTE` para distinguirla de `CANCELADA` (cancelación interna por staff). Ambas adiciones son no-breaking en PostgreSQL (agregar valores a un enum no requiere downtime).

---

## Decision 5: `tipoServicio` en `Restaurante` — String vs. enum

**Decision**: Migrar `Restaurante.tipoServicio` de `String?` a un nuevo enum `TipoServicioRestaurante`.

**Rationale**: El campo existe como `String?` actualmente. La spec requiere valores controlados: MESA, DELIVERY, PARA_LLEVAR, MIXTO. Validar solo en aplicación (Zod) sin enum en BD deja la BD en estado inconsistente entre implementaciones. La migración convierte la columna existente; los registros existentes ya usan esos valores exactos por convención.

---

## Decision 6: Campos adicionales en `Restaurante` vs. nueva tabla `PerfilRestaurante`

**Decision**: Extender el modelo `Restaurante` existente con los campos de perfil público (en lugar de crear una tabla `PerfilRestaurante` separada).

**Rationale**: El modelo `Restaurante` ya tiene `capacidadMesas`, `capacidadComensales`, `tipoServicio`, `duracionPromedioMin`. Los campos faltantes (`especialidad`, `horarios`, `fotos`, `contactoPublico`) son atributos directos del mismo restaurante, no una entidad independiente. Crear una tabla `PerfilRestaurante` separada con relación 1-a-1 añadiría un JOIN sin beneficio real. Los campos `horarios` y `fotos` se almacenan como JSON array por su naturaleza variable pero no consultable individualmente.

---

## Decision 7: Reservas públicas — modelo nuevo vs. reutilizar `Reserva`

**Decision**: Reutilizar el modelo `Reserva` existente, diferenciándose por `canalOrigen = "WEB"` y `estado = PENDIENTE`.

**Rationale**: Las reservas públicas y las internas son la misma entidad de negocio: una reserva de mesa. La diferencia es el canal (WEB vs. PRESENCIAL) y el estado inicial (PENDIENTE para online, RESERVADA para staff). El staff gestiona ambas desde el módulo interno ya implementado. No se duplica la entidad.

**Implication**: La validación de que el restaurante acepta `tipoServicio ∈ {MESA, MIXTO}` ocurre en el caso de uso `crear-reserva-publica`.

---

## Decision 8: Publicaciones del restaurante

**Decision**: Reutilizar el modelo `Publicacion` existente (schema `social`), filtrado por `tenantId` de restaurantes activos.

**Rationale**: `Publicacion` ya tiene `tenantId`, `autorId`, `tipo`, `estado`, medios y reacciones. Las publicaciones del restaurante son publicaciones del tenant con `esRestaurante = true`. No se necesita `referenciaTipo` explícito en la tabla; el scope por `tenantId` + filtro `esRestaurante` es suficiente para el feed y el perfil.
