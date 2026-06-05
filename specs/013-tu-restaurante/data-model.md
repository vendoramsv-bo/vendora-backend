# Data Model: TuRestaurante — Perfil Público de Restaurante

## Cambios en modelos existentes

### 1. `Restaurante` (en `prisma/10-tenant.prisma`) — EXTENDER

Agregar campos al modelo existente:

```prisma
model Restaurante {
  // ...campos existentes...
  tipoServicio      TipoServicioRestaurante? // cambiar de String? a enum
  especialidad      String?           // "parrilla argentina", "italiana", "comida de mar"
  horarios          Json?             // HorarioPublico[] — ver estructura abajo
  fotos             String[]          // URLs de fotos del local
  contactoPublico   Json?             // ContactoPublico — ver estructura abajo

  // Nuevas relaciones sociales (módulo social)
  reacciones            RestauranteReaccion[]
  comentarios           RestauranteComentario[]
  valoraciones          RestauranteValoracion[]
  preguntas             RestaurantePregunta[]
  favoritos             RestauranteFavorito[]
  seguidores            RestauranteSeguidor[]
}
```

**Estructura JSON `horarios`**:
```ts
type HorarioPublico = {
  diaSemana: 'LUNES'|'MARTES'|'MIERCOLES'|'JUEVES'|'VIERNES'|'SABADO'|'DOMINGO'
  tiempoComida: string        // nombre del TiempoComida (DESAYUNO, ALMUERZO, CENA…)
  horaInicio: string          // "07:00"
  horaFin: string             // "10:30"
  activo: boolean
}
```

**Estructura JSON `contactoPublico`**:
```ts
type ContactoPublico = {
  telefono?: string
  email?: string
  redesSociales?: { red: string; url: string }[]
}
```

---

### 2. `EstadoReserva` (en `prisma/70-restaurante.prisma`) — AGREGAR VALORES

```prisma
enum EstadoReserva {
  PENDIENTE         // [NUEVO] Reserva online creada, esperando confirmación del staff
  RESERVADA         // Confirmada por staff, esperando llegada del cliente
  CONFIRMADA        // Cliente llegó y confirmó en persona
  EN_PREPARACION
  LISTA
  ENTREGADA
  PAGADA
  RECHAZADA         // [NUEVO] Staff rechazó la reserva PENDIENTE (solicitud denegada)
  CANCELADA         // Cancelada por staff/admin (reserva ya confirmada)
  CANCELADA_CLIENTE // [NUEVO] Cancelada por el consumidor online
  NO_ASISTIO
}
```

---

### 3. `TipoServicioRestaurante` (en `prisma/70-restaurante.prisma`) — NUEVO ENUM

```prisma
enum TipoServicioRestaurante {
  MESA
  DELIVERY
  PARA_LLEVAR
  MIXTO
  @@schema("restaurante")
}
```

> Nota: Requiere migración de la columna `Restaurante.tipoServicio` de `String?` a `TipoServicioRestaurante?`.

---

## Nuevos modelos en `prisma/80-social.prisma`

Todos los modelos siguen el patrón de los modelos `Tienda*` existentes.

### 4. `RestauranteReaccion`

```prisma
model RestauranteReaccion {
  id            String      @id @default(cuid())
  restauranteId String
  restaurante   Restaurante @relation(fields: [restauranteId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation("reaccionesRestaurante", fields: [userId], references: [id], onDelete: Cascade)
  tipo          TipoReaccion
  createdAt     DateTime    @default(now())

  @@unique([restauranteId, userId])
  @@index([restauranteId])
  @@index([userId])
  @@schema("social")
}
```

### 5. `RestauranteComentario`

```prisma
model RestauranteComentario {
  id            String                          @id @default(cuid())
  restauranteId String
  restaurante   Restaurante                     @relation(fields: [restauranteId], references: [id], onDelete: Cascade)
  userId        String
  user          User                            @relation("comentariosRestaurante", fields: [userId], references: [id], onDelete: Cascade)
  contenido     String
  editado       Boolean                         @default(false)
  estado        Estado                          @default(ACTIVO)
  padreId       String?
  padre         RestauranteComentario?          @relation("ComentarioRestauranteRespuestas", fields: [padreId], references: [id])
  respuestas    RestauranteComentario[]         @relation("ComentarioRestauranteRespuestas")
  reacciones    RestauranteComentarioReaccion[]
  createdAt     DateTime                        @default(now())
  updatedAt     DateTime?                       @updatedAt

  @@index([restauranteId])
  @@index([userId])
  @@index([padreId])
  @@schema("social")
}
```

### 6. `RestauranteComentarioReaccion`

```prisma
model RestauranteComentarioReaccion {
  id           String                @id @default(cuid())
  comentarioId String
  comentario   RestauranteComentario @relation(fields: [comentarioId], references: [id], onDelete: Cascade)
  userId       String
  user         User                  @relation("reaccionesComentarioRestaurante", fields: [userId], references: [id], onDelete: Cascade)
  tipo         TipoReaccion
  createdAt    DateTime              @default(now())

  @@unique([comentarioId, userId])
  @@index([comentarioId])
  @@schema("social")
}
```

### 7. `RestauranteValoracion`

```prisma
model RestauranteValoracion {
  id            String      @id @default(cuid())
  restauranteId String
  restaurante   Restaurante @relation(fields: [restauranteId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation("valoracionesRestaurante", fields: [userId], references: [id], onDelete: Cascade)
  puntuacion    Int         // 1–5
  resena        String?
  estado        Estado      @default(ACTIVO)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime?   @updatedAt

  @@unique([restauranteId, userId])
  @@index([restauranteId])
  @@schema("social")
}
```

### 8. `RestaurantePregunta`

```prisma
model RestaurantePregunta {
  id            String                  @id @default(cuid())
  restauranteId String
  restaurante   Restaurante             @relation(fields: [restauranteId], references: [id], onDelete: Cascade)
  userId        String
  user          User                    @relation("preguntasRestaurante", fields: [userId], references: [id], onDelete: Cascade)
  pregunta      String
  estado        Estado                  @default(ACTIVO) // ACTIVO=VISIBLE, INACTIVO=OCULTA
  createdAt     DateTime                @default(now())
  updatedAt     DateTime?               @updatedAt
  respuestas    RestauranteRespuesta[]

  @@index([restauranteId])
  @@index([userId])
  @@schema("social")
}
```

### 9. `RestauranteRespuesta`

```prisma
model RestauranteRespuesta {
  id         String              @id @default(cuid())
  preguntaId String
  pregunta   RestaurantePregunta @relation(fields: [preguntaId], references: [id], onDelete: Cascade)
  userId     String
  user       User                @relation("respuestasRestaurante", fields: [userId], references: [id], onDelete: Cascade)
  respuesta  String
  estado     Estado              @default(ACTIVO)
  createdAt  DateTime            @default(now())
  updatedAt  DateTime?           @updatedAt

  @@index([preguntaId])
  @@schema("social")
}
```

### 10. `RestauranteFavorito`

```prisma
model RestauranteFavorito {
  id            String      @id @default(cuid())
  restauranteId String
  restaurante   Restaurante @relation(fields: [restauranteId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation("favoritosRestaurante", fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())

  @@unique([restauranteId, userId])
  @@index([userId])
  @@schema("social")
}
```

### 11. `RestauranteSeguidor`

```prisma
model RestauranteSeguidor {
  id            String      @id @default(cuid())
  restauranteId String
  restaurante   Restaurante @relation(fields: [restauranteId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation("seguidoresRestaurante", fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())

  @@unique([restauranteId, userId])
  @@index([restauranteId])
  @@index([userId])
  @@schema("social")
}
```

---

## Estado: Transiciones de `Reserva`

```
[consumidor online]   PENDIENTE
                        │
        ┌───────────────┼──────────────────────┐
        ▼               ▼                      ▼
    RESERVADA        RECHAZADA          CANCELADA_CLIENTE
  (staff confirma) (staff rechaza)     (consumidor cancela)
        │
     [flujo interno existente]
        │
  CONFIRMADA → EN_PREPARACION → LISTA → ENTREGADA → PAGADA
        │
      CANCELADA  ← (staff cancela una reserva ya RESERVADA)
```

`PENDIENTE`, `RECHAZADA` y `CANCELADA_CLIENTE` son los tres estados nuevos. `RECHAZADA` distingue el rechazo de solicitud online de `CANCELADA` (cancelación post-confirmación por staff).

---

## Resumen de cambios al schema Prisma

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `prisma/10-tenant.prisma` | Agregar campos a `Restaurante`: `especialidad`, `horarios`, `fotos`, `contactoPublico` | ALTER TABLE (nullable) |
| `prisma/10-tenant.prisma` | Cambiar `Restaurante.tipoServicio` de `String?` a `TipoServicioRestaurante?` | ALTER COLUMN (requiere migración) |
| `prisma/10-tenant.prisma` | Agregar relaciones `Restaurante` → modelos sociales nuevos | Schema only |
| `prisma/70-restaurante.prisma` | Agregar `PENDIENTE`, `RECHAZADA`, `CANCELADA_CLIENTE` a `EstadoReserva` | ADD VALUE ×3 (non-breaking en Postgres) |
| `prisma/70-restaurante.prisma` | Nuevo enum `TipoServicioRestaurante` | CREATE TYPE |
| `prisma/80-social.prisma` | 8 nuevos modelos: `RestauranteReaccion`, `RestauranteComentario`, `RestauranteComentarioReaccion`, `RestauranteValoracion`, `RestaurantePregunta`, `RestauranteRespuesta`, `RestauranteFavorito`, `RestauranteSeguidor` | CREATE TABLE ×8 |
