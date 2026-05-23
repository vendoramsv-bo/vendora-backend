// =============================================================================
// prisma.config.ts — Configuración moderna de Prisma 7
//
// Este archivo reemplaza la configuración via `package.json#prisma`. Es la
// forma recomendada en Prisma 7 y soporta type-safety en la config.
// =============================================================================

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Apunta al directorio donde vive la entrada (schema.prisma) y los modelos
  // El config está dentro de prisma/, así que "." apunta al mismo directorio
  schema: ".",

  // Carpeta de migraciones
  migrations: {
    path: "prisma/migrations",
    // Comando que ejecuta `prisma migrate dev` para seedear datos
    seed: "tsx prisma/seed.ts",
  },

  // Conexión a la base de datos (variable de entorno)
  datasource: {
    url: env("DATABASE_URL"),
  },
});