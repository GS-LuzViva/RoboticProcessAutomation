import { useSyncExternalStore } from "react"

/** A tabela de chamados só cabe com folga a partir de 1024 px; abaixo disso a tela usa a lista. */
const CONSULTA = "(min-width: 1024px)"

function assinar(aoMudar: () => void) {
  const consulta = window.matchMedia(CONSULTA)
  consulta.addEventListener("change", aoMudar)
  return () => consulta.removeEventListener("change", aoMudar)
}

/** true a partir de 1024 px (tabela); false abaixo (lista empilhada). */
export function useTelaLarga(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => true,
  )
}
