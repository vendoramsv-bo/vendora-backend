// =============================================================================
// prisma.config.ts — Configuración del CLI de Prisma 7
//
// Provee el DATABASE_URL al CLI (migrate, studio, generate) cargando .env
// desde la raíz del proyecto con ruta absoluta, independientemente del CWD.
//
// Nota: el adapter (@prisma/adapter-pg) se usa en PrismaClient en runtime
// (ver better-auth.setup.ts y prisma-scoped.ts), no aquí.
// =============================================================================

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "prisma/config";

// Carga .env desde la raíz del proyecto (un nivel arriba de prisma/)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env") });

export default defineConfig({
  // Directorio donde viven schema.prisma y los archivos de modelos
  schema: ".",

  // Migraciones y seed — ruta absoluta para evitar ambigüedad con el CWD
  migrations: {
    path: resolve(__dirname, "migrations"),
    seed: "tsx prisma/seed.ts",
  },

  // URL de conexión para el CLI (migrate dev, studio, generate)
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
