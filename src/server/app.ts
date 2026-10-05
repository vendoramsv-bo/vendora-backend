import { crearApp } from "./hono.js"
import { authRouter } from "../modules/autenticacion/adapters/auth.rest.js"
import { tenantRouter } from "../modules/tenant/adapters/tenant.rest.js"
import { wizardRouter } from "../modules/tenant/adapters/wizard.rest.js"
import { tenantUploadRouter } from "../modules/tenant/adapters/tenant-upload.rest.js"
import { configuracionContenidoRouter } from "../modules/tenant/adapters/configuracion-contenido.rest.js"
import { configuracionNegocioRouter } from "../modules/tenant/adapters/configuracion-negocio.rest.js"
import { configuracionMiembrosRouter } from "../modules/tenant/adapters/configuracion-miembros.rest.js"
import { tiendaStaffRouter } from "../modules/tienda/adapters/tienda-staff.rest.js"
import { tiendaPublicaRouter } from "../modules/tienda/adapters/tienda-publica.rest.js"
import { consultorioPublicaRouter } from "../modules/consultorio/adapters/consultorio-publica.rest.js"
import { consultorioConsumerCitasRouter } from "../modules/consultorio/adapters/consultorio-consumer-citas.rest.js"
import { consultorioStaffPublicoRouter } from "../modules/consultorio/adapters/consultorio-staff-publico.rest.js"

// La app con **todas** las rutas, sin arrancar el servidor, Socket.IO ni workers.
// `crearApp()` solo monta los módulos; un test de contrato sobre ella no ve las
// rutas de /api/tenant y da falsos "faltantes" (pasó en la auditoría de la 020).
export function crearAppCompleta() {
  const app = crearApp()

  app.route("/api", authRouter)

  app.route("/api/tenant", tenantRouter)
  app.route("/api/tenant", wizardRouter)
  app.route("/api/tenant", tenantUploadRouter)
  app.route("/api/tenant", configuracionContenidoRouter)
  app.route("/api/tenant", configuracionNegocioRouter)
  app.route("/api/tenant", configuracionMiembrosRouter)

  app.route("/api/tenant", tiendaStaffRouter)
  app.route("/api/public/tiendas", tiendaPublicaRouter)

  app.route("/api/public/consultorios", consultorioPublicaRouter)
  app.route("/api/consumer/consultorios", consultorioConsumerCitasRouter)
  app.route("/api/consultorio", consultorioStaffPublicoRouter)

  return app
}
