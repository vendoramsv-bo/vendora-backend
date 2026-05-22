// T055 — Benchmark de latencia Socket.IO para SC-006 (eventos < 2s p95)
// Ejecutar con: pnpm tsx tests/perf/socket-latency.ts
//
// Requiere servidor corriendo (pnpm dev) con Redis y una sesión activa.

import { io as ioClient } from "socket.io-client"

const BASE_URL = process.env.APP_URL ?? "http://localhost:3000"
const SESSION_TOKEN = process.env.BENCH_SESSION_TOKEN ?? ""
const TENANT_ID = process.env.BENCH_TENANT_ID ?? ""
const ITERATIONS = 20

async function medirLatencia(token: string, tenantId: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(BASE_URL, {
      auth: { token },
      transports: ["websocket"],
    })

    const latencias: number[] = []
    let iteracion = 0

    socket.on("connect", () => {
      console.log("[socket-bench] Conectado")
      ejecutarIteracion()
    })

    socket.on("tenant:actualizado", () => {
      const latencia = Date.now() - tiempoInicio
      latencias.push(latencia)
      iteracion++

      if (iteracion >= ITERATIONS) {
        socket.disconnect()
        resolve(latencias)
      } else {
        ejecutarIteracion()
      }
    })

    socket.on("connect_error", (err) => reject(err))

    let tiempoInicio = 0

    function ejecutarIteracion() {
      tiempoInicio = Date.now()
      // Disparar actualización via HTTP para medir round-trip hasta evento Socket.IO
      fetch(`${BASE_URL}/api/auth/organization/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-active-organization-id": tenantId,
        },
        body: JSON.stringify({ descripcion: `Bench ${Date.now()}` }),
      }).catch(console.error)
    }
  })
}

function percentil(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

async function main() {
  if (!SESSION_TOKEN || !TENANT_ID) {
    console.error("[socket-bench] Se requieren BENCH_SESSION_TOKEN y BENCH_TENANT_ID")
    console.error("  Ejemplo: BENCH_SESSION_TOKEN=xxx BENCH_TENANT_ID=yyy pnpm tsx tests/perf/socket-latency.ts")
    process.exit(1)
  }

  console.log(`[socket-bench] Midiendo latencia Socket.IO (${ITERATIONS} iteraciones)`)

  try {
    const latencias = await medirLatencia(SESSION_TOKEN, TENANT_ID)

    const p50 = percentil(latencias, 50)
    const p95 = percentil(latencias, 95)
    const p99 = percentil(latencias, 99)

    console.log("\n[socket-bench] Resultados:")
    console.log(`  p50: ${p50}ms`)
    console.log(`  p95: ${p95}ms`)
    console.log(`  p99: ${p99}ms`)

    // SC-006: eventos en tiempo real < 2s p95
    const umbral = 2000
    const passed = p95 < umbral
    console.log(`\n  SC-006: p95=${p95}ms — ${passed ? `✅ PASS (umbral: ${umbral}ms)` : `❌ FAIL (umbral: ${umbral}ms)`}`)

    process.exit(passed ? 0 : 1)
  } catch (err) {
    console.error("[socket-bench] Error:", err)
    process.exit(1)
  }
}

main()
