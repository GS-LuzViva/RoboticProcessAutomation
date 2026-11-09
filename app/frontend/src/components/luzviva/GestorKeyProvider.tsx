import { useMemo, useState, type ReactNode } from "react"

import { ChaveGestorContext } from "@/hooks/use-chave-gestor"

/**
 * Guarda a chave do gestor só em memória (nunca em localStorage, cookie ou URL).
 * `useAtualizarChamado` a envia como `X-API-Key` no PATCH.
 */
export function GestorKeyProvider({ children }: { children: ReactNode }) {
  const [chave, setChave] = useState<string | null>(null)
  const valor = useMemo(
    () => ({ chave, definirChave: (nova: string | null) => setChave(nova?.trim() || null) }),
    [chave],
  )
  return <ChaveGestorContext.Provider value={valor}>{children}</ChaveGestorContext.Provider>
}
