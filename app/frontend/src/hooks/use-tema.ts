import { createContext, useContext } from "react"

import type { PreferenciaTema, TemaEfetivo } from "@/lib/tema"

export interface ContextoTema {
  /** O que o usuário escolheu (ou "sistema"). */
  preferencia: PreferenciaTema
  /** O tema em uso agora. */
  tema: TemaEfetivo
  definirPreferencia: (preferencia: PreferenciaTema) => void
}

export const TemaContext = createContext<ContextoTema | null>(null)

/** Tema atual e a função para trocar. Use dentro de `<ProvedorTema>`. */
export function useTema(): ContextoTema {
  const contexto = useContext(TemaContext)
  if (!contexto) throw new Error("useTema precisa estar dentro de <ProvedorTema>.")
  return contexto
}
