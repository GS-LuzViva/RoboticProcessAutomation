import { AREAS } from "@/lib/dominio"
import type { PainelArea } from "@/lib/tipos"

/** Segmentos da barra empilhada, na ordem do desenho: as falhas encostadas no zero. */
export const SEGMENTOS = [
  { chave: "apagadas", nome: "Apagada", plural: "apagadas", classe: "bg-apagada-mapa" },
  { chave: "insuficientes", nome: "Insuficiente", plural: "insuficientes", classe: "bg-insuficiente-mapa" },
  { chave: "ok", nome: "Ok", plural: "ok", classe: "bg-ok-mapa" },
] as const

export type ChaveSegmento = (typeof SEGMENTOS)[number]["chave"]

export interface LinhaPainel extends PainelArea {
  /** inspecionadas − apagadas − insuficientes. */
  ok: number
  /** Inspecionadas sobre cadastradas, 0..100 (null sem cadastradas). */
  pct_inspecionadas: number | null
}

const naoNegativo = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

/** Completa as linhas da view com o "ok" e a cobertura, na ordem fixa das áreas. */
export function montarLinhas(dados: readonly PainelArea[]): LinhaPainel[] {
  const ordem = (a: PainelArea) => {
    const i = AREAS.indexOf(a.subprefeitura)
    return i === -1 ? AREAS.length : i
  }
  return [...dados]
    .sort((a, b) => ordem(a) - ordem(b))
    .map((p) => ({
      ...p,
      ok: naoNegativo(p.luminarias_inspecionadas - p.apagadas - p.insuficientes),
      pct_inspecionadas:
        p.luminarias_cadastradas > 0 ? (p.luminarias_inspecionadas / p.luminarias_cadastradas) * 100 : null,
    }))
}

export function valorSegmento(linha: LinhaPainel, chave: ChaveSegmento): number {
  return naoNegativo(linha[chave])
}

const percentualFixo = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Percentual 0..100 sempre com uma casa ("5,0%"), para as áreas se compararem casa a casa. */
export function formatarPercentual1(valor0a100: number | null | undefined): string {
  if (typeof valor0a100 !== "number" || !Number.isFinite(valor0a100)) return "—"
  return percentualFixo.format(valor0a100 / 100)
}
