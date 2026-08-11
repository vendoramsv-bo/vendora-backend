/**
 * Semilla de cuentas por rol — verificación manual de la feature 023.
 *
 * Cubre `specs/023-panel-por-rol/quickstart.md` §1, que es la parte más lenta
 * del setup y la que hace posibles SC-001, SC-004, SC-005 y SC-007: **hace falta
 * una cuenta por rol en el mismo negocio**, y eso no se verifica leyendo código.
 *
 * Qué crea:
 *
 *   Negocio 1 — "Vendora Prueba 023"      (esTienda)
 *     propietario@vendora.test   role="owner"       → se normaliza a PROPIETARIO
 *     admin@vendora.test         role="ADMIN"       → todo MENOS la Zona de Peligro
 *     vendedor-a@vendora.test    role="VENDEDOR"    → menú de operación, KPIs propios
 *     vendedor-b@vendora.test    role="VENDEDOR"    → el otro lado de la comparación de US2
 *     bodeguero@vendora.test     role="BODEGUERO"   → stock y abastecimiento, sin caja
 *     sinrol@vendora.test        role="member"      → rol NO reconocido, conjunto mínimo
 *
 *   Negocio 2 — "Vendora Prueba 023 Bis"  (esTienda)
 *     vendedor-a@vendora.test    role="BODEGUERO"   → la MISMA persona con OTRO rol
 *     propietario@vendora.test   role="owner"
 *
 * La fila `member` es la que más se olvida y la que cubre el caso que más
 * probablemente ocurra en producción: `TenantMember.role` tiene
 * `@default("member")`, así que toda membresía creada por invitación sin rol
 * explícito cae ahí.
 *
 * El segundo negocio con la misma persona en otro rol es lo que hace verificable
 * FR-011: cambiar de negocio en el conmutador tiene que reconfigurar el menú
 * **sin recargar la página**.
 *
 * Uso:
 *   cd vendora-backend
 *   pnpm db:seed:roles
 *
 * Es idempotente: se puede correr las veces que haga falta.
 * Para limpiar: pnpm db:seed:roles -- --limpiar
 */
import { config } from "dotenv"
import { resolve } from "path"
import { fileURLToPath } from "url"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { hashPassword } from "better-auth/crypto"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
config({ path: resolve(__dirname, "../.env") })

const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: pgAdapter })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

/** Una sola contraseña para todas: son cuentas de prueba, no de nadie. */
const CLAVE = "Vendora2026!"

/**
 * `ultimoPasoCreacion: 11` es "FINALIZADO" (`wizard.rest.ts:27`).
 *
 * Sin esto el alta de negocio secuestra la sesión y manda al wizard en vez de
 * al panel, y no se puede verificar nada del menú.
 */
const WIZARD_FINALIZADO = 11

interface CuentaSemilla {
  email: string
  nombre: string
  userName: string
}

const CUENTAS: Record<string, CuentaSemilla> = {
  propietario: { email: "propietario@vendora.test", nombre: "Propietaria de Prueba", userName: "propietario023" },
  admin:       { email: "admin@vendora.test",       nombre: "Admin de Prueba",       userName: "admin023" },
  vendedorA:   { email: "vendedor-a@vendora.test",  nombre: "Vendedor A",            userName: "vendedora023" },
  vendedorB:   { email: "vendedor-b@vendora.test",  nombre: "Vendedor B",            userName: "vendedorb023" },
  bodeguero:   { email: "bodeguero@vendora.test",   nombre: "Bodeguero de Prueba",   userName: "bodeguero023" },
  sinRol:      { email: "sinrol@vendora.test",      nombre: "Sin Rol Asignado",      userName: "sinrol023" },
}

const NEGOCIOS = {
  principal: {
    slug: "vendora-prueba-023",
    name: "Vendora Prueba 023",
    nombreLargo: "Vendora Prueba 023 — negocio de verificación",
  },
  secundario: {
    slug: "vendora-prueba-023-bis",
    name: "Vendora Prueba 023 Bis",
    nombreLargo: "Vendora Prueba 023 Bis — segundo negocio para el conmutador",
  },
}

/**
 * Membresías. La clave es el rol **tal como se guarda**, sin normalizar: el
 * punto de la prueba es que `owner` y `member` lleguen crudos al cliente y que
 * sea `useRolActivo()` quien decida qué significan.
 */
const MEMBRESIAS: Array<{ negocio: keyof typeof NEGOCIOS; cuenta: keyof typeof CUENTAS; role: string }> = [
  { negocio: "principal", cuenta: "propietario", role: "owner" },
  { negocio: "principal", cuenta: "admin", role: "ADMIN" },
  { negocio: "principal", cuenta: "vendedorA", role: "VENDEDOR" },
  { negocio: "principal", cuenta: "vendedorB", role: "VENDEDOR" },
  { negocio: "principal", cuenta: "bodeguero", role: "BODEGUERO" },
  { negocio: "principal", cuenta: "sinRol", role: "member" },
  // El mismo vendedor, en otro negocio, con otro rol (SC-005, FR-011).
  { negocio: "secundario", cuenta: "propietario", role: "owner" },
  { negocio: "secundario", cuenta: "vendedorA", role: "BODEGUERO" },
]

// ---------------------------------------------------------------------------

async function crearNegocio(def: (typeof NEGOCIOS)[keyof typeof NEGOCIOS], creadoPorId: string) {
  return db.tenant.upsert({
    where: { slug: def.slug },
    update: {
      // `estado: ACTIVO` a propósito: el default del modelo es PENDIENTE, y un
      // negocio pendiente no es el escenario que se quiere verificar. Además,
      // volver a correr la semilla RESUCITA un negocio que se dio de baja
      // probando US3 — que es justo lo que hace falta para probarlo otra vez.
      estado: "ACTIVO",
      ultimoPasoCreacion: WIZARD_FINALIZADO,
    },
    create: {
      name: def.name,
      slug: def.slug,
      nombreLargo: def.nombreLargo,
      descripcion: "Negocio sembrado para verificar el panel por rol (feature 023).",
      esTienda: true,
      estado: "ACTIVO",
      ultimoPasoCreacion: WIZARD_FINALIZADO,
      createdById: creadoPorId,
    },
  })
}

async function crearUsuario(cuenta: CuentaSemilla) {
  const usuario = await db.user.upsert({
    where: { email: cuenta.email },
    update: {
      // `requireEmailVerification: true` en `better-auth.setup.ts`: sin esto la
      // cuenta existe y **no puede iniciar sesión**, que es un fallo confuso
      // porque no dice que el problema es la verificación.
      emailVerified: true,
    },
    create: {
      email: cuenta.email,
      name: cuenta.nombre,
      userName: cuenta.userName,
      emailVerified: true,
    },
  })

  // La credencial va aparte, en `Account`, con el hash que produce el propio
  // Better-Auth. Escribir el hash a mano con otro algoritmo crea una cuenta que
  // existe y nunca deja entrar.
  const hash = await hashPassword(CLAVE)
  await db.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: cuenta.email } },
    update: { password: hash },
    create: {
      providerId: "credential",
      accountId: cuenta.email,
      userId: usuario.id,
      password: hash,
    },
  })

  return usuario
}

async function sembrar() {
  console.log("Sembrando cuentas por rol (feature 023)...\n")

  const usuarios: Record<string, { id: string }> = {}
  for (const [clave, cuenta] of Object.entries(CUENTAS)) {
    usuarios[clave] = await crearUsuario(cuenta)
    console.log(`  usuario  ${cuenta.email}`)
  }

  const negocios: Record<string, { id: string; name: string }> = {}
  for (const [clave, def] of Object.entries(NEGOCIOS)) {
    negocios[clave] = await crearNegocio(def, usuarios.propietario.id)
    console.log(`  negocio  ${def.name}`)
  }

  console.log("")
  for (const m of MEMBRESIAS) {
    const organizationId = negocios[m.negocio].id
    const userId = usuarios[m.cuenta].id
    await db.tenantMember.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: { role: m.role, estado: "ACTIVO" },
      create: { organizationId, userId, role: m.role, estado: "ACTIVO" },
    })
    console.log(`  ${negocios[m.negocio].name.padEnd(24)} ${CUENTAS[m.cuenta].email.padEnd(28)} role="${m.role}"`)
  }

  console.log(`\n✓ ${Object.keys(CUENTAS).length} cuentas · ${Object.keys(NEGOCIOS).length} negocios · ${MEMBRESIAS.length} membresías`)
  console.log(`\n  Contraseña de todas: ${CLAVE}`)
  console.log("\n  Qué mirar en cada una (quickstart §3):")
  console.log("    propietario  → único con Zona de Peligro")
  console.log("    admin        → todo MENOS la Zona de Peligro (FR-021)")
  console.log("    vendedor-a   → operación y catálogo en consulta; sin stock")
  console.log("                   y al cambiar al 2º negocio el menú se reconfigura SIN recargar")
  console.log("    bodeguero    → stock y abastecimiento; sin caja ni punto de venta")
  console.log("    sinrol       → menú MÍNIMO (Panel + Punto de venta). NUNCA vacío")
  console.log("\n  La prueba que más se olvida: entrar con vendedor-a y hacer clic")
  console.log("  en Clientes y en Gastos. Si responden 403, faltan los guards de contracts §A.6.")
}

async function limpiar() {
  console.log("Limpiando la semilla de la feature 023...\n")

  const emails = Object.values(CUENTAS).map((c) => c.email)
  const slugs = Object.values(NEGOCIOS).map((n) => n.slug)

  // Las membresías se van solas por `onDelete: Cascade` desde User y Tenant,
  // pero se borran primero para que el orden no dependa de la cascada.
  const usuarios = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true } })
  const negocios = await db.tenant.findMany({ where: { slug: { in: slugs } }, select: { id: true } })

  await db.tenantMember.deleteMany({
    where: {
      OR: [
        { userId: { in: usuarios.map((u: { id: string }) => u.id) } },
        { organizationId: { in: negocios.map((n: { id: string }) => n.id) } },
      ],
    },
  })
  await db.tenant.deleteMany({ where: { slug: { in: slugs } } })
  await db.user.deleteMany({ where: { email: { in: emails } } })

  console.log("✓ Cuentas y negocios de prueba eliminados")
}

const debeLimpiar = process.argv.includes("--limpiar")

;(debeLimpiar ? limpiar() : sembrar())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
