import { config } from "dotenv"
import { resolve } from "path"
import { fileURLToPath } from "url"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
config({ path: resolve(__dirname, "../.env") })

const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: pgAdapter })

const PROVEEDORES = [
  { id: "ALICORP",         nombre: "Alicorp Bolivia" },
  { id: "COCA_COLA",       nombre: "Coca Cola Bolivia" },
  { id: "PACEÑA",          nombre: "Cervecería Boliviana Nacional" },
  { id: "SOBOCE",          nombre: "SOBOCE" },
  { id: "COBOCE",          nombre: "COBOCE" },
  { id: "DELIZIA",         nombre: "Delizia" },
  { id: "PIL_ANDINA",      nombre: "PIL Andina" },
  { id: "FRITZ",           nombre: "Fritz Bolivia" },
  { id: "IMBA",            nombre: "IMBA" },
  { id: "INSUMOS_MEDICOS", nombre: "Insumos Médicos Bolivia" },
  { id: "FARMACORP",       nombre: "Farmacorp" },
]

const TURNOS = [
  { id: "MANANA",    turno: "Mañana",    descripcion: "Turno de la mañana (6:00 - 12:00)" },
  { id: "TARDE",     turno: "Tarde",     descripcion: "Turno de la tarde (12:00 - 18:00)" },
  { id: "NOCHE",     turno: "Noche",     descripcion: "Turno de la noche (18:00 - 24:00)" },
  { id: "MADRUGADA", turno: "Madrugada", descripcion: "Turno de madrugada (0:00 - 6:00)" },
]

async function main() {
  console.log("Sembrando ClaProveedor...")
  for (const p of PROVEEDORES) {
    await (prisma as any).claProveedor.upsert({
      where: { id: p.id },
      update: { nombre: p.nombre },
      create: { id: p.id, nombre: p.nombre },
    })
  }
  console.log(`✓ ${PROVEEDORES.length} proveedores sembrados`)

  console.log("Sembrando ClaTurnosDeAtencion...")
  for (const t of TURNOS) {
    await (prisma as any).claTurnosDeAtencion.upsert({
      where: { id: t.id },
      update: { turno: t.turno, descripcion: t.descripcion },
      create: { id: t.id, turno: t.turno, descripcion: t.descripcion },
    })
  }
  console.log(`✓ ${TURNOS.length} turnos sembrados`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
