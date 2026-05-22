import { Hono } from "hono"
import { requireAuth, requireTenantActivo, requireConsultorio, type HonoEnv } from "../../../core/hono-context.js"
import { consultorioPerfilRouter } from "./consultorio.rest.js"
import { medicoRouter } from "./medico.rest.js"
import { pacienteRouter } from "./paciente.rest.js"
import { servicioMedicoRouter } from "./servicio-medico.rest.js"
import { citaRouter } from "./cita.rest.js"
import { historiaClinicaRouter } from "./historia-clinica.rest.js"
import { atencionMedicaRouter } from "./atencion-medica.rest.js"
import { recetaMedicaRouter } from "./receta-medica.rest.js"

const consultorioApp = new Hono<HonoEnv>()

consultorioApp.use("*", requireAuth, requireTenantActivo, requireConsultorio)

consultorioApp.route("/", consultorioPerfilRouter)
consultorioApp.route("/", medicoRouter)
consultorioApp.route("/", pacienteRouter)
consultorioApp.route("/", servicioMedicoRouter)
consultorioApp.route("/", citaRouter)
consultorioApp.route("/", historiaClinicaRouter)
consultorioApp.route("/", atencionMedicaRouter)
consultorioApp.route("/", recetaMedicaRouter)

export { consultorioApp }
