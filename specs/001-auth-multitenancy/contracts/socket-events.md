# Contratos Socket.IO — Módulo Tenant

> Eventos emitidos desde los hooks de dominio (Artículo VI.2).
> Todos se emiten a la sala `tenant:${tenantId}`.
> El contrato tipado vive en el paquete `@vendora/api-types` (Artículo VIII.4).

---

## Sala de suscripción

Los clientes se unen al conectarse con una sesión activa:

```
tenant:${tenantId}
```

El servidor verifica que el userId pertenezca al tenant antes de admitir la conexión
a esa sala. El mismo token de sesión autentica el handshake (Artículo VII.3).

---

## Eventos Server → Client

### `tenant:actualizado`

Emitido cuando el propietario o admin actualiza los datos del tenant.

**Payload:**
```ts
{
  tenantId: string
  cambios: {
    name?: string
    slug?: string
    logo?: string | null
    nombreLargo?: string
    descripcion?: string
    esTienda?: boolean
    esConsultorio?: boolean
    esRestaurante?: boolean
    plan?: string
    estado?: string
  }
  actualizadoPor: string   // userId del editor
  timestamp: string        // ISO 8601
}
```

**Origen:** hook `onOrganizationUpdated` de BA → `ITenantNotificador.tenantActualizado()`

---

### `tenant:eliminado`

Emitido cuando el propietario elimina el tenant. Al recibirlo, el cliente debe
invalidar su sesión local y redirigir al usuario.

**Payload:**
```ts
{
  tenantId: string
  eliminadoPor: string    // userId del propietario
  timestamp: string
}
```

**Origen:** hook `onOrganizationDeleted` de BA → `ITenantNotificador.tenantEliminado()`

---

### `tenant:miembro:unido`

Emitido cuando un nuevo miembro acepta una invitación.

**Payload:**
```ts
{
  tenantId: string
  miembro: {
    userId: string
    nombre: string
    email: string
    rol: string
  }
  timestamp: string
}
```

---

### `tenant:miembro:removido`

Emitido cuando un miembro es eliminado del tenant o sale voluntariamente.

**Payload:**
```ts
{
  tenantId: string
  userId: string        // miembro que salió/fue removido
  timestamp: string
}
```

---

## Tipo TypeScript compartido

```ts
// packages/@vendora/api-types/src/socket.ts
export interface ServerToClientEvents {
  "tenant:actualizado": (payload: TenantActualizadoPayload) => void
  "tenant:eliminado":   (payload: TenantEliminadoPayload)   => void
  "tenant:miembro:unido":   (payload: MiembroUnidoPayload)   => void
  "tenant:miembro:removido": (payload: MiembroRemovidoPayload) => void
}
```
