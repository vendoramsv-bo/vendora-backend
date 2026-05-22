// T054 — Benchmark de latencia HTTP para SC-002 (sign-in < 3s) y SC-003 (create tenant < 3s)
// Ejecutar con: pnpm tsx tests/perf/auth-latency.ts
//
// Requiere servidor corriendo (pnpm dev) y una DB real con usuario de prueba.
// Instalar autocannon globalmente o como devDependency: pnpm add -D autocannon

import { execSync } from "node:child_process"

const BASE_URL = process.env.APP_URL ?? "http://localhost:3000"

async function runBenchmark(name: string, url: string, method: string, body: unknown) {
  console.log(`\n[bench] ${name}`)
  console.log(`  URL: ${method} ${url}`)

  const result = execSync(
    `npx autocannon -c 10 -d 10 --method ${method} --headers "Content-Type=application/json" --body '${JSON.stringify(body)}' ${url}`,
    { encoding: "utf-8", stdio: "pipe" },
  )

  console.log(result)

  // Parsear p99 del output de autocannon
  const p99Match = result.match(/99%\s+\|\s+(\d+(?:\.\d+)?)\s+ms/)
  if (p99Match) {
    const p99 = parseFloat(p99Match[1])
    const threshold = 3000
    const passed = p99 < threshold
    console.log(`  p99: ${p99}ms — ${passed ? "✅ PASS" : `❌ FAIL (umbral: ${threshold}ms)`}`)
    return { name, p99, passed }
  }

  return { name, p99: -1, passed: false }
}

async function main() {
  console.log("[bench] Benchmarks de latencia HTTP — Vendora Backend")
  console.log(`[bench] Target: ${BASE_URL}`)

  const results = []

  // SC-002: sign-in < 3s p95
  results.push(
    await runBenchmark("POST /api/auth/sign-in/email (SC-002)", `${BASE_URL}/api/auth/sign-in/email`, "POST", {
      email: "bench@test.com",
      password: "test1234",
    }),
  )

  // SC-003: create tenant < 3s p95
  results.push(
    await runBenchmark("POST /api/auth/organization/create (SC-003)", `${BASE_URL}/api/auth/organization/create`, "POST", {
      name: "Bench Tenant",
      slug: "bench-tenant",
      nombreLargo: "Benchmark Tenant S.A.",
      descripcion: "Tenant de benchmark",
    }),
  )

  console.log("\n[bench] Resumen:")
  for (const r of results) {
    console.log(`  ${r.passed ? "✅" : "❌"} ${r.name}: p99=${r.p99}ms`)
  }

  const allPassed = results.every((r) => r.passed)
  process.exit(allPassed ? 0 : 1)
}

main().catch(console.error)
