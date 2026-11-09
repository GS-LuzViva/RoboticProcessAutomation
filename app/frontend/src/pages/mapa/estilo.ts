import { useSyncExternalStore } from "react"
import { CircleHelp, Lightbulb, LightbulbOff, SunDim, type LucideIcon } from "lucide-react"

import type { Situacao } from "@/lib/tipos"

/** Ícone (o mesmo do SituacaoBadge) e classes de token de cada situação, para a legenda. */
export const VISUAL_SITUACAO: Record<Situacao, { icone: LucideIcon; ponto: string; texto: string }> = {
  apagada: { icone: LightbulbOff, ponto: "bg-apagada-mapa", texto: "text-apagada" },
  insuficiente: { icone: SunDim, ponto: "bg-insuficiente-mapa", texto: "text-insuficiente" },
  ok: { icone: Lightbulb, ponto: "bg-ok-mapa", texto: "text-ok" },
  sem_medicao: { icone: CircleHelp, ponto: "bg-sem-medicao-mapa", texto: "text-sem-medicao" },
}

/** Raio do círculo no mapa: a falha também se distingue pelo tamanho, não só pela cor. */
export const RAIO_SITUACAO: Record<Situacao, number> = { apagada: 8, insuficiente: 7, ok: 5, sem_medicao: 4 }

/** Ordem da legenda: o que precisa de conserto primeiro. */
export const ORDEM_LEGENDA: readonly Situacao[] = ["apagada", "insuficiente", "ok", "sem_medicao"]

/** Plural das situações para frases ("11 apagadas"). */
export const PLURAL_SITUACAO: Record<Situacao, [string, string]> = {
  apagada: ["apagada", "apagadas"],
  insuficiente: ["insuficiente", "insuficientes"],
  ok: ["ok", "ok"],
  sem_medicao: ["sem medição", "sem medição"],
}

const CONSULTA_MOVIMENTO = "(prefers-reduced-motion: reduce)"

function assinarMovimento(aoMudar: () => void) {
  const consulta = window.matchMedia(CONSULTA_MOVIMENTO)
  consulta.addEventListener("change", aoMudar)
  return () => consulta.removeEventListener("change", aoMudar)
}

/** true quando o sistema pede menos movimento (o mapa não anima zoom nem deslocamento). */
export function useMovimentoReduzido(): boolean {
  return useSyncExternalStore(
    assinarMovimento,
    () => window.matchMedia(CONSULTA_MOVIMENTO).matches,
    () => false,
  )
}

const CONSULTA_DESKTOP = "(min-width: 1024px)"

function assinarDesktop(aoMudar: () => void) {
  const consulta = window.matchMedia(CONSULTA_DESKTOP)
  consulta.addEventListener("change", aoMudar)
  return () => consulta.removeEventListener("change", aoMudar)
}

/** true a partir de 1024 px, quando a lista de falhas fica ao lado do mapa. */
export function useTelaLarga(): boolean {
  return useSyncExternalStore(
    assinarDesktop,
    () => window.matchMedia(CONSULTA_DESKTOP).matches,
    () => true,
  )
}

const CONSULTA_ESTREITA = "(max-width: 359px)"

function assinarEstreita(aoMudar: () => void) {
  const consulta = window.matchMedia(CONSULTA_ESTREITA)
  consulta.addEventListener("change", aoMudar)
  return () => consulta.removeEventListener("change", aoMudar)
}

/** true abaixo de 360 px (320 px): o popup do poste estreita para caber no mapa. */
export function useTelaEstreita(): boolean {
  return useSyncExternalStore(
    assinarEstreita,
    () => window.matchMedia(CONSULTA_ESTREITA).matches,
    () => false,
  )
}
