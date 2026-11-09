/**
 * Agrupa as luminárias da view em postes (mesma placa, mesmo ponto e mesma situação).
 * Um poste pode ter várias luminárias com a mesma leitura; no mapa elas ficariam empilhadas
 * no mesmo pixel e na lista apareceriam repetidas. As contagens continuam por luminária,
 * iguais às do Painel.
 */
import { SITUACOES } from "@/lib/dominio"
import type { Luminaria, Situacao } from "@/lib/tipos"

export interface Poste {
  /** Chave estável do grupo (placa, ponto e situação). */
  id: string
  placa: string | null
  endereco: string | null
  lat: number
  lon: number
  situacao: Situacao
  /** Menor leitura entre as luminárias do poste (a pior). */
  ultimo_lux: number | null
  /** Leitura mais recente entre as luminárias do poste. */
  ultima_medicao: string | null
  /** Maior número de relatos do app entre as luminárias do poste. */
  ocorrencias_app: number
  /** Quantas luminárias da view estão neste poste. */
  luminarias: number
}

export type Contagem = Record<Situacao, number>

export function contagemVazia(): Contagem {
  return { apagada: 0, insuficiente: 0, ok: 0, sem_medicao: 0 }
}

const temCoordenada = (l: Luminaria) => Number.isFinite(l.lat) && Number.isFinite(l.lon)

/** Agrupa em postes e conta luminárias por situação. */
export function agruparPostes(luminarias: readonly Luminaria[]): { postes: Poste[]; contagem: Contagem; total: number } {
  const porChave = new Map<string, Poste>()
  const contagem = contagemVazia()
  let total = 0
  for (const l of luminarias) {
    if (!temCoordenada(l)) continue
    const situacao: Situacao = SITUACOES.includes(l.situacao) ? l.situacao : "sem_medicao"
    contagem[situacao] += 1
    total += 1
    const chave = `${l.placa ?? `sem-placa-${l.id_luminaria}`}|${l.lat}|${l.lon}|${situacao}`
    const existente = porChave.get(chave)
    if (!existente) {
      porChave.set(chave, {
        id: chave,
        placa: l.placa,
        endereco: l.endereco,
        lat: l.lat,
        lon: l.lon,
        situacao,
        ultimo_lux: l.ultimo_lux,
        ultima_medicao: l.ultima_medicao,
        ocorrencias_app: l.ocorrencias_app ?? 0,
        luminarias: 1,
      })
      continue
    }
    existente.luminarias += 1
    if (l.ultimo_lux !== null && (existente.ultimo_lux === null || l.ultimo_lux < existente.ultimo_lux)) {
      existente.ultimo_lux = l.ultimo_lux
    }
    if (l.ultima_medicao && (!existente.ultima_medicao || l.ultima_medicao > existente.ultima_medicao)) {
      existente.ultima_medicao = l.ultima_medicao
    }
    existente.ocorrencias_app = Math.max(existente.ocorrencias_app, l.ocorrencias_app ?? 0)
    if (!existente.endereco && l.endereco) existente.endereco = l.endereco
  }
  return { postes: [...porChave.values()], contagem, total }
}

/** Ordem de desenho: as falhas por cima (o último desenhado fica no topo do canvas). */
const ORDEM_DESENHO: Record<Situacao, number> = { sem_medicao: 0, ok: 1, insuficiente: 2, apagada: 3 }

export function ordenarParaDesenho(postes: readonly Poste[]): Poste[] {
  return [...postes].sort((a, b) => ORDEM_DESENHO[a.situacao] - ORDEM_DESENHO[b.situacao])
}

/** Postes com falha: apagada primeiro, depois do menor lux para o maior (sem leitura no fim). */
export function postesComFalha(postes: readonly Poste[]): Poste[] {
  return postes
    .filter((p) => p.situacao === "apagada" || p.situacao === "insuficiente")
    .sort((a, b) => {
      if (a.situacao !== b.situacao) return a.situacao === "apagada" ? -1 : 1
      const la = a.ultimo_lux ?? Number.POSITIVE_INFINITY
      const lb = b.ultimo_lux ?? Number.POSITIVE_INFINITY
      return la - lb
    })
}
