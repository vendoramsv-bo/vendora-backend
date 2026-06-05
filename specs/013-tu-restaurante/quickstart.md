# Quickstart: TuRestaurante — Perfil Público de Restaurante

## Contexto para el desarrollador

Este feature extiende el módulo `restaurante` existente con capacidades de perfil público:
directorio de restaurantes, menú público, reservas online e interacciones sociales.
La referencia directa para el patrón de implementación es el módulo `tienda` (feature 012-tu-tienda).

## Prerrequisitos

1. Feature 012-tu-tienda completado (social module patterns para `Tienda*` ya implementados).
2. Módulo `restaurante` existente funcionando (menus, cocina, reservas internas).
3. `Restaurante` entity y `esRestaurante` flag ya en el schema Prisma.

## Flujo de implementación recomendado

### Paso 1: Schema Prisma (antes de cualquier código)
```
prisma/10-tenant.prisma   → Agregar campos a Restaurante (especialidad, horarios, fotos, contactoPublico)
                          → Cambiar tipoServicio de String? a TipoServicioRestaurante?
prisma/70-restaurante.prisma → Agregar PENDIENTE y CANCELADA_CLIENTE a EstadoReserva
                             → Nuevo enum TipoServicioRestaurante
prisma/80-social.prisma   → 8 nuevos modelos Restaurante* (ver data-model.md)
```

Después de los cambios: `npx prisma migrate dev --name tu-restaurante-public-profile`

### Paso 2: Dominio restaurante — puertos nuevos
```
src/modules/restaurante/domain/ports/
  IRestaurantePublicoRepository.ts    ← métodos: obtenerPerfil, listarDirectorio, listarMenusPublicos,
                                         crearReservaPublica, listarMisReservas, cancelarReservaPublica
  IRestaurantePublicoNotificador.ts   ← métodos: notificarNuevaReserva, notificarPerfilActualizado,
                                         notificarReservaActualizada
```

### Paso 3: Casos de uso — `restaurante` module
```
src/modules/restaurante/application/
  perfil-publico/
    activar-perfil-publico.usecase.ts
    desactivar-perfil-publico.usecase.ts
    actualizar-configuracion-publica.usecase.ts
    obtener-perfil-publico.usecase.ts
  directorio-publico/
    listar-directorio.usecase.ts
  menu-publico/
    listar-menus-publicos.usecase.ts
  reserva-publica/
    crear-reserva-publica.usecase.ts
    listar-mis-reservas.usecase.ts
    cancelar-reserva-publica.usecase.ts
```

### Paso 4: Dominio social — puertos nuevos
```
src/modules/social/domain/ports/
  IRestauranteSocialRepository.ts
  IRestauranteSocialNotificador.ts
```

### Paso 5: Casos de uso — `social` module
```
src/modules/social/application/
  restaurante/
    reaccionar-restaurante.usecase.ts
    comentar-restaurante.usecase.ts
    listar-comentarios-restaurante.usecase.ts
    responder-comentario-restaurante.usecase.ts
    valorar-restaurante.usecase.ts
    listar-valoraciones-restaurante.usecase.ts
    preguntar-restaurante.usecase.ts
    responder-pregunta-restaurante.usecase.ts
    ocultar-pregunta-restaurante.usecase.ts
    mostrar-pregunta-restaurante.usecase.ts
    listar-preguntas-restaurante.usecase.ts
    toggle-favorito-restaurante.usecase.ts
    toggle-seguir-restaurante.usecase.ts
    listar-seguidores-restaurante.usecase.ts
  publicacion-restaurante/
    publicar-novedad.usecase.ts
    listar-publicaciones.usecase.ts
```

### Paso 6: Infraestructura
```
src/modules/restaurante/infrastructure/
  restaurante-publico.prisma.repository.ts
  restaurante-publico.socket.notificador.ts

src/modules/social/infrastructure/
  restaurante-social.prisma.repository.ts
  restaurante-social.socket.notificador.ts
```

### Paso 7: Adaptadores REST
```
src/modules/restaurante/adapters/
  restaurante-publica.rest.ts        ← GET /api/public/restaurantes/*
  restaurante-staff-publico.rest.ts  ← /api/staff/restaurante/perfil/*, reservas staff

src/modules/social/adapters/
  restaurante-social-publica.rest.ts  ← GET /api/public/restaurantes/:slug/valoraciones|comentarios|preguntas
  restaurante-social-consumer.rest.ts ← POST /api/consumer/restaurantes/:slug/*
  restaurante-social-staff.rest.ts    ← /api/staff/restaurante/preguntas/*, publicaciones
  restaurante-social.schema.ts        ← Zod schemas para todos los endpoints sociales
```

### Paso 8: Registrar en el router principal
Agregar los nuevos routers en `src/app.ts` o el archivo de registro de rutas principal.

---

## Patrones clave a replicar

### Consulta de directorio con Haversine
Ver `src/modules/tienda/infrastructure/tienda.prisma.repository.ts` — función `haversineKm()`.
Aplicar el mismo patrón para el directorio de restaurantes.

### Guard `esRestaurante`
Ver el guard `esTienda` en el módulo tienda. Crear guard equivalente que valide
`tenant.esRestaurante === true` antes de ejecutar use cases de staff.

### Contrato uniforme de paginación
Usar `makeQueryParamsSchema`, `toPrismaArgs`, `paginate` de `core/query-params.ts`.

### Notificaciones en tiempo real
Emitir eventos desde el caso de uso (no desde el adaptador REST), vía el puerto `IRestaurantePublicoNotificador`.
Sala base: `tenant:${tenantId}`. Sub-sala opcional: `tenant:${tenantId}:restaurante`.

---

## Tests a escribir

### Unit (fakes en memoria)
- `activar-perfil-publico.usecase.spec.ts` — happy path + ya activo
- `desactivar-perfil-publico.usecase.spec.ts`
- `crear-reserva-publica.usecase.spec.ts` — validaciones: tipo DELIVERY, fecha pasada
- `cancelar-reserva-publica.usecase.spec.ts` — solo PENDIENTE cancelable
- `valorar-restaurante.usecase.spec.ts` — upsert (segunda valoración reemplaza primera)
- `ocultar-pregunta-restaurante.usecase.spec.ts` — solo PROPIETARIO/ADMIN

### Integration (Testcontainers — PostgreSQL real)
- `restaurante-publico.prisma.repository.spec.ts` — CRUD de perfil + directorio con Haversine
- `restaurante-social.prisma.repository.spec.ts` — valoraciones, comentarios (árbol), preguntas

---

## Verificación rápida de privacidad
Después de implementar, verificar que NINGÚN endpoint público expone:
- `Reserva.totalEstimado` o detalles de precio interno
- `MenuItem.precio` de costo (solo `precio` de venta del snapshot)
- Cualquier campo de `Menu.creadoPor`
- Datos de `Almacen`, `MovimientoInventario`, `AperturaCierreDeCaja`
