import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { TemaContext, type ContextoTema } from "@/hooks/use-tema"
import {
  aplicarTema,
  lerPreferencia,
  observarSistema,
  resolverTema,
  salvarPreferencia,
  type PreferenciaTema,
} from "@/lib/tema"

/** Guarda a preferência de tema, aplica no <html> e segue o sistema quando a preferência é "sistema". */
export function ProvedorTema({ children }: { children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(lerPreferencia)
  const [tema, setTema] = useState(() => resolverTema(preferencia))

  useEffect(() => {
    const atualizar = () => {
      const efetivo = resolverTema(preferencia)
      setTema(efetivo)
      aplicarTema(efetivo)
    }
    atualizar()
    if (preferencia !== "sistema") return
    return observarSistema(atualizar)
  }, [preferencia])

  const definirPreferencia = useCallback((nova: PreferenciaTema) => {
    salvarPreferencia(nova)
    setPreferencia(nova)
  }, [])

  const valor = useMemo<ContextoTema>(
    () => ({ preferencia, tema, definirPreferencia }),
    [preferencia, tema, definirPreferencia],
  )
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}
