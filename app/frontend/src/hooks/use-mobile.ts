import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function assinar(aoMudar: () => void) {
  const consulta = window.matchMedia(CONSULTA)
  consulta.addEventListener("change", aoMudar)
  return () => consulta.removeEventListener("change", aoMudar)
}

/** true abaixo de 768 px (celular: a barra lateral vira Sheet). */
export function useIsMobile() {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  )
}
