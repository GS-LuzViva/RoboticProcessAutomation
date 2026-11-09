import { createContext, useContext } from "react"

export interface ContextoChaveGestor {
  /** Chave do gestor (X-API-Key) desta visita, ou null. Só em memória: some ao recarregar. */
  chave: string | null
  definirChave: (chave: string | null) => void
}

export const ChaveGestorContext = createContext<ContextoChaveGestor | null>(null)

/** Lê e define a chave do gestor. Use dentro de `<GestorKeyProvider>`. */
export function useChaveGestor(): ContextoChaveGestor {
  const contexto = useContext(ChaveGestorContext)
  if (!contexto) throw new Error("useChaveGestor precisa estar dentro de <GestorKeyProvider>.")
  return contexto
}
