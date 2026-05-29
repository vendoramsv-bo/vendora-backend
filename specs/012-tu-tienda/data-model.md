# Data Model: TuTienda — Perfil Público de Comercio de Barrio

## Modelos Existentes (solo lectura / sin cambios de estructura)

### Tenant (`@@schema("tenant")`)
```
Tenant {
  id            String  @id
  esTienda      Boolean @default(false)   // flag de visibilidad pública
  esTiendaActivo: computed via Tienda relation
  ...campos existentes...
  tienda        Tienda?                    // relación 1:1 opcional
  localizaciones Localizacion[]
  productos     Producto[]
  actividadesEconomicas ActividadEconomica[]
  categorias    Categoria[]
}
```

### Localizacion (`@@schema("tenant")`)
```
Localizacion {
  id           String
  tenantId     String
  latitud      Float   // usado para búsqueda geoespacial del directorio
  longitud     Float
  direccion    String
  barrio       String?
  ciudad       String
  departamento String
  @@index([latitud, longitud])
}
```

### Tienda (`@@schema("tenant")`) — EXISTE, sin cambios estructurales
```
Tienda {
  id              String    @id
  tenantId        String    @unique     // 1:1 con Tenant
  configuracion   Configuracion?
  // relaciones sociales (ya existen, sin cambios)
  reacciones      TiendaReaccion[]
  comentarios     TiendaComentario[]
  valoraciones    TiendaValoracion[]
  preguntas       TiendaPregunta[]
  favoritos       TiendaFavorito[]
  seguidores      TiendaSeguidor[]
  createdById     String?
  updatedById     String?
}
```

### Configuracion (`@@schema("tenant")`) — EXISTE, sin cambios estructurales
```
Configuracion {
  id                   String                @id
  tiendaId             String                @unique
  tipoDeTienda         TipoDeConfiguracion   @default(PEQUENA)
  cantidadPuntosDeVenta Int                  @default(1)
  tipoDespliegueVentas TipoDespliegueVentas  @default(BARRA_LATERAL)
  tema                 String                @default("green")
  tipoLineado          String                @default("curvedLine")
  estado               Estado                @default(ACTIVO)
}
```

### TiendaComentario (`@@schema("social")`) — EXISTE, sin cambios estructurales
```
TiendaComentario {
  id         String
  tiendaId   String
  userId     String
  contenido  String
  editado    Boolean   @default(false)
  estado     Estado    @default(ACTIVO)
  padreId    String?                     // árbol recursivo sin límite
  padre      TiendaComentario?  @relation("ComentarioTiendaRespuestas")
  respuestas TiendaComentario[] @relation("ComentarioTiendaRespuestas")
  reacciones TiendaComentarioReaccion[]
}
```

### TiendaValoracion (`@@schema("social")`) — EXISTE, sin cambios estructurales
```
TiendaValoracion {
  id         String
  tiendaId   String
  userId     String
  puntuacion Int       // 1–5
  resena     String?
  estado     Estado    @default(ACTIVO)
  @@unique([tiendaId, userId])  // una sola valoración activa por par
}
```

### TiendaPregunta (`@@schema("social")`) — CAMBIO: default PENDIENTE → ACTIVO
```
TiendaPregunta {
  id         String
  tiendaId   String
  userId     String
  pregunta   String
  estado     Estado    @default(ACTIVO)    // ← CAMBIO: era PENDIENTE
  // ACTIVO = visible públicamente; INACTIVO = ocultada por PROPIETARIO/ADMIN
  respuestas TiendaRespuesta[]
}
```
**Migration**: `ALTER TABLE social."TiendaPregunta" ALTER COLUMN "estado" SET DEFAULT 'ACTIVO'`

---

## Modelo Nuevo

### ProductoDestacado (`@@schema("tenant")`) — NUEVO
```
ProductoDestacado {
  id          String    @id  @default(cuid())
  tiendaId    String
  tienda      Tienda    @relation(fields: [tiendaId], references: [id], onDelete: Cascade)
  productoId  String
  producto    Producto  @relation(fields: [productoId], references: [id], onDelete: Cascade)
  orden       Int       @default(0)   // posición en la vitrina (0 = primero)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime? @updatedAt
  createdById String?
  updatedById String?

  @@unique([tiendaId, productoId])
  @@index([tiendaId, orden])
  @@schema("tenant")
}
```

**Restricciones de negocio**:
- Máximo 20 productos destacados por tienda (validado en use case, no en DB)
- El producto referenciado DEBE tener `estado = ACTIVO` y `visiblePublicamente = true`
- Relación bidireccional: agregar `productosDestacados ProductoDestacado[]` en `Tienda` y en `Producto`

---

## Relaciones clave

```
Tenant 1──1 Tienda
Tienda 1──1 Configuracion
Tienda 1──N ProductoDestacado ──N─1 Producto
Tienda 1──N TiendaComentario (árbol, padreId)
Tienda 1──N TiendaValoracion (@@unique tiendaId+userId)
Tienda 1──N TiendaPregunta ──N─N TiendaRespuesta
Tienda 1──N TiendaFavorito (@@unique tiendaId+userId)
Tienda 1──N TiendaSeguidor (@@unique tiendaId+userId)
Tienda 1──N TiendaReaccion (@@unique tiendaId+userId)
Tenant 1──N Publicacion (ya existente, feed de seguidores)
Tenant 1──N Localizacion (para directorio geoespacial)
```

---

## Estados y Transiciones

### TiendaPregunta.estado
```
[ACTIVO] ──(ocultar por PROPIETARIO/ADMIN)──► [INACTIVO]
[INACTIVO] ──(mostrar por PROPIETARIO/ADMIN)──► [ACTIVO]
```

### Tenant.esTienda
```
false ──(activar por PROPIETARIO)──► true   (tienda visible en directorio)
true  ──(desactivar por PROPIETARIO)──► false  (tienda oculta del directorio)
```

### Configuracion.estado
```
ACTIVO (por defecto) ── sin transiciones especiales
```

---

## Eventos Socket.IO (nuevos)

| Evento | Sala | Payload |
|--------|------|---------|
| `tienda:configuracion:actualizada` | `tenant:{tenantId}` | `{ tiendaId, campo }` |
| `tienda:destacados:actualizados` | `tenant:{tenantId}` | `{ tiendaId }` |
| `tienda:nueva:valoracion` | `tenant:{tenantId}` | `{ tiendaId, userId, puntuacion }` |
| `tienda:nuevo:comentario` | `tenant:{tenantId}` | `{ tiendaId, comentarioId }` |
| `tienda:nueva:pregunta` | `tenant:{tenantId}` | `{ tiendaId, preguntaId }` |
| `tienda:nuevo:seguidor` | `tenant:{tenantId}` | `{ tiendaId, userId }` |
