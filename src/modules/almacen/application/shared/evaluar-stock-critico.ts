// Determina si un cambio de stock cruzó el umbral del mínimo.
// Retorna "critico" si cayó por debajo, "normalizado" si se recuperó, null si no hubo cruce.
export function evaluarStockCritico(
  stockAntes: number,
  stockDespues: number,
  stockMinimo: number
): "critico" | "normalizado" | null {
  if (stockAntes >= stockMinimo && stockDespues < stockMinimo) return "critico"
  if (stockAntes < stockMinimo && stockDespues >= stockMinimo) return "normalizado"
  return null
}
