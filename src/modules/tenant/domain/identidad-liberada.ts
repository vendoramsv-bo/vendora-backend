/**
 * Nombre y slug que toma un negocio al darse de baja (frontend spec 038).
 *
 * La baja es lógica —la fila queda para conservar ventas y comprobantes—, pero
 * `name`, `slug` y `nombreLargo` son únicos (en la tabla; el slug además en
 * Better-Auth, que lo rechaza con `ORGANIZATION_ALREADY_EXISTS`). Sin
 * liberarlos, el propietario no podía crear un negocio nuevo con los mismos
 * datos. Son los tres `@unique` del modelo `Tenant`: si se agrega otro, va acá.
 *
 * El sufijo sale del id para que dos bajas del mismo nombre no choquen. Los
 * valores originales los guarda el `AuditLog` de la baja.
 */
export function identidadLiberada(negocio: {
  id: string
  name: string
  slug: string
  nombreLargo: string
}): { name: string; slug: string; nombreLargo: string } {
  const sufijo = negocio.id.slice(-8).toLowerCase()
  return {
    name: `${negocio.name} (eliminado ${sufijo})`,
    slug: `${negocio.slug}--eliminado-${sufijo}`,
    nombreLargo: `${negocio.nombreLargo} (eliminado ${sufijo})`,
  }
}
