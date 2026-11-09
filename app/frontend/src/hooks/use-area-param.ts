import { useCallback } from "react"
import { useSearchParams } from "react-router"

import { AREAS } from "@/lib/dominio"
import type { Area } from "@/lib/tipos"

/** Nome do parâmetro na URL: `#/fila?area=PINHEIROS`. */
export const PARAMETRO_AREA = "area"
/** Valor de "Todas" na URL (só quando a tela aceita). */
export const VALOR_TODAS = "TODAS"
export const AREA_PADRAO: Area = "SE"

/** Aceita "SE", "pinheiros", "CAMPO LIMPO", "CAMPO_LIMPO" e "campo-limpo". */
export function lerArea(valor: string | null): Area | null {
  if (!valor) return null
  const normal = valor.trim().toUpperCase().replace(/[_-]+/g, " ")
  return (AREAS as readonly string[]).includes(normal) ? (normal as Area) : null
}

export interface OpcoesAreaParam {
  /** Aceita "Todas" (`?area=TODAS`), que vira `null`. */
  permitirTodas?: boolean
}

/**
 * Área selecionada, guardada na URL (`?area=`), para um link compartilhado abrir na mesma área.
 * Padrão "SE". Com `permitirTodas`, `null` significa todas as áreas.
 * Trocar a área substitui a entrada do histórico (não empilha "voltar").
 */
export function useAreaParam(): [Area, (area: Area) => void]
export function useAreaParam(opcoes: { permitirTodas: true }): [Area | null, (area: Area | null) => void]
export function useAreaParam(opcoes?: OpcoesAreaParam): [Area | null, (area: Area | null) => void]
export function useAreaParam(opcoes: OpcoesAreaParam = {}): [Area | null, (area: Area) => void] {
  const [parametros, setParametros] = useSearchParams()
  const bruto = parametros.get(PARAMETRO_AREA)
  const permitirTodas = Boolean(opcoes.permitirTodas)
  const area: Area | null =
    permitirTodas && bruto?.trim().toUpperCase() === VALOR_TODAS ? null : (lerArea(bruto) ?? AREA_PADRAO)

  const definir = useCallback(
    (nova: Area | null) => {
      setParametros(
        (atuais) => {
          const proximos = new URLSearchParams(atuais)
          proximos.set(PARAMETRO_AREA, nova ?? (permitirTodas ? VALOR_TODAS : AREA_PADRAO))
          return proximos
        },
        { replace: true },
      )
    },
    [setParametros, permitirTodas],
  )
  return [area, definir]
}
