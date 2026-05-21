# TuPlataformaAmiga — Estructura modular del schema Prisma

Plataforma SaaS multi-tenant que integra tres verticales sobre un núcleo
compartido:

| Vertical              | Flag del Tenant       |
| --------------------- | --------------------- |
| TuTiendaAmiga         | `esTienda`            |
| TuConsultorioAmigo    | `esConsultorio`       |
| TuRestaurant          | `esRestaurante`       |

Un mismo Tenant puede activar cualquier combinación (incluso los tres).

---

## Estructura del directorio `prisma/`

```
prisma/
├── schema.prisma                       ← Punto de entrada (generator + datasource)
└── models/
    ├── 00-autenticacion.prisma         ← Better-Auth (User, Session, Account…)
    ├── 10-tenant.prisma                ← Tenant + perfiles (Tienda, Consultorio, Restaurante)
    ├── 20-compartido.prisma            ← Notificacion, Mensaje, AuditLog, clasificadores
    ├── 30-catalogo.prisma              ← Producto + variantes + ofertas
    ├── 40-almacen.prisma               ← Insumo, movimientos, recuentos
    ├── 50-ventas.prisma                ← Venta, Compra, Pedido, Caja, Cliente
    ├── 60-consultorio.prisma           ← Paciente, Cita, AtencionMedica, Receta
    ├── 70-restaurante.prisma           ← Menu, Reserva, panel de cocina
    └── 80-social.prisma                ← Reacciones, comentarios, publicaciones
```

Prisma 6.7+ concatena automáticamente todos los `.prisma` del directorio
configurado en `prisma.config.ts`. No hace falta tocar imports.

---

## Schemas de PostgreSQL

Cada modelo pertenece a uno de los siguientes namespaces:

| Schema           | Modelos | Propósito                                                   |
| ---------------- | ------- | ----------------------------------------------------------- |
| `autenticacion`  | 5       | Better-Auth (`user`, `session`, `account`, `verification`, `invitation`) |
| `tenant`         | 12      | Identidad multi-tenant y perfiles de los 3 SaaS             |
| `compartido`     | 11      | Servicios cross-módulo y clasificadores globales            |
| `catalogo`       | 13      | Catálogo comercial de productos y servicios                 |
| `almacen`        | 14      | Inventario e insumos                                        |
| `ventas`         | 15      | Operación comercial (caja, ventas, compras)                 |
| `consultorio`    | 19      | Módulo TuConsultorioAmigo                                   |
| `restaurante`    | 7       | Módulo TuRestaurant                                         |
| `social`         | 21      | Interacciones sociales                                      |
| **Total**        | **117** |                                                             |

Las **124 relaciones cross-schema** funcionan sin configuración adicional —
PostgreSQL soporta foreign keys entre namespaces y Prisma las gestiona
transparentemente.

---

## Configuración inicial

### 1. Instalar dependencias

```bash
npm install prisma@^6 @prisma/client@^6 better-auth dotenv tsx
```

### 2. Variables de entorno (`.env`)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/tuplataforma?schema=public"
BETTER_AUTH_SECRET="genera-un-secret-de-32-caracteres-aqui"
APP_URL="http://localhost:3000"

# Opcionales
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

> Nota: el `?schema=public` en `DATABASE_URL` es el schema **por defecto**
> para queries raw. Prisma usa los `@@schema(...)` de cada modelo para las
> queries del ORM, así que no afecta la multi-schema.

### 3. Primer setup

```bash
# Genera el cliente Prisma
npx prisma generate

# Crea los 9 schemas en PostgreSQL y todas las tablas
npx prisma migrate dev --name init
```

---

## Comandos del día a día

| Comando                          | Para qué sirve                                                  |
| -------------------------------- | --------------------------------------------------------------- |
| `npx prisma generate`            | Regenera el cliente TypeScript tras cambiar el schema           |
| `npx prisma migrate dev`         | Crea y aplica una migración en desarrollo                       |
| `npx prisma migrate deploy`      | Aplica migraciones pendientes en producción (sin generar nuevas) |
| `npx prisma studio`              | Abre la UI web para inspeccionar/editar datos                   |
| `npx prisma db push`             | Sincroniza schema sin crear migración (solo prototipos)         |
| `npx prisma migrate reset`       | Borra y recrea toda la base (¡cuidado en producción!)           |

---

## Permisos por rol en PostgreSQL (opcional pero recomendado)

Una ventaja clave del multi-schema es poder dar accesos diferenciados:

```sql
-- Rol para la app de farmacia: solo lee consultorio y catalogo, escribe ventas
CREATE ROLE farmacia_app LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA consultorio, catalogo, ventas TO farmacia_app;
GRANT SELECT ON ALL TABLES IN SCHEMA consultorio, catalogo TO farmacia_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ventas TO farmacia_app;

-- Rol para la app de cocina: lee menu y restaurante, escribe estados
CREATE ROLE cocina_app LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA restaurante, catalogo TO cocina_app;
GRANT SELECT ON ALL TABLES IN SCHEMA catalogo TO cocina_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA restaurante TO cocina_app;

-- Rol auditor: solo lectura, todos los schemas
CREATE ROLE auditor LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA autenticacion, tenant, compartido, catalogo, almacen,
                     ventas, consultorio, restaurante, social TO auditor;
GRANT SELECT ON ALL TABLES IN SCHEMA autenticacion, tenant, compartido, catalogo,
                                    almacen, ventas, consultorio, restaurante, social TO auditor;
```

---

## Cómo añadir un nuevo modelo

1. **Decidir el módulo correcto**. Si el modelo se relaciona principalmente
   con `Producto`, va en `catalogo`. Si es operación comercial (caja, ventas),
   va en `ventas`. Etc.

2. **Editar el archivo del módulo**. Ej: agregar `OfertaCombo` en
   `prisma/models/30-catalogo.prisma`.

3. **Incluir `@@schema(...)` al final del modelo**:

   ```prisma
   model OfertaCombo {
     id String @id @default(cuid())
     // ...campos...

     @@schema("catalogo")
   }
   ```

4. **Crear migración**:

   ```bash
   npx prisma migrate dev --name agregar_oferta_combo
   ```

---

## Querying entre schemas

Sin cambios en el código — Prisma resuelve los namespaces automáticamente:

```ts
// Esta query toca 4 schemas distintos en un solo statement
const venta = await prisma.venta.findUnique({
  where: { id },
  include: {
    ventasDetalle: {              // → schema "ventas"
      include: {
        producto: {               // → schema "catalogo"
          include: {
            categoria: true,      // → schema "catalogo"
          },
        },
      },
    },
    tenant: true,                 // → schema "tenant"
    tenantMember: {               // → schema "tenant"
      include: {
        user: true,               // → schema "autenticacion"
      },
    },
  },
});
```

---

## Better-Auth y el schema modular

Better-Auth funciona transparentemente: invoca `prisma.user.*`, `prisma.session.*`,
etc., y Prisma traduce a las tablas físicas con su namespace correspondiente
(`autenticacion.user`, `autenticacion.session`, …).

Los mapeos están en cada modelo de `00-autenticacion.prisma` y `10-tenant.prisma`:

| Modelo Prisma | Tabla física              |
| ------------- | ------------------------- |
| `User`        | `autenticacion.user`      |
| `Session`     | `autenticacion.session`   |
| `Account`     | `autenticacion.account`   |
| `Verification`| `autenticacion.verification` |
| `Invitacion`  | `autenticacion.invitation` |
| `Tenant`      | `tenant.organization`     |
| `TenantMember`| `tenant.member`           |
