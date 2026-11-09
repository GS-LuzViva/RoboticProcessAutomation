/**
 * Formatação pt-BR e cálculo de prazo. Datas da API são ISO sem fuso já no horário de São Paulo:
 * aqui elas são tratadas como "relógio de parede" (nunca convertidas pelo fuso do navegador).
 */
import { NOMES_AREA, NOMES_SITUACAO, NOMES_STATUS, PRAZO_DIAS, STATUS_EM_ABERTO } from "@/lib/dominio"
import type { Area, Chamado, DataHoraIso, Situacao, StatusChamado } from "@/lib/tipos"

/** Texto para valor ausente em tabelas e detalhes. */
export const VAZIO = "—"

/** Espaço não separável entre número e unidade ("0,4 lux" não quebra linha). */
const NBSP = " "

const UM_DIA_MS = 86_400_000
const FUSO_SP = "America/Sao_Paulo"

const numero1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const numero0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
const percentual1 = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 })
const percentual0 = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 })

const ehNumero = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n)

/** 17035 → "17.035"; 93.5 → "93,5". */
export function formatarNumero(n: number | null | undefined, casas: 0 | 1 = 1): string {
  if (!ehNumero(n)) return VAZIO
  return (casas === 0 ? numero0 : numero1).format(n)
}

/** 0.4 → "0,4 lux" (com espaço não separável). null → "sem medição". */
export function formatarLux(lux: number | null | undefined): string {
  if (!ehNumero(lux)) return "sem medição"
  return `${numero1.format(lux)}${NBSP}lux`
}

/** Percentual na escala 0..100 (ex.: `pct_com_falha`). 11.9 → "11,9%". */
export function formatarPercentual(valor0a100: number | null | undefined): string {
  if (!ehNumero(valor0a100)) return VAZIO
  return percentual1.format(valor0a100 / 100)
}

/** Confiança na escala 0..1 (visão, assistente). 0.95 → "95%". */
export function formatarConfianca(valor0a1: number | null | undefined): string {
  if (!ehNumero(valor0a1)) return VAZIO
  return percentual0.format(valor0a1)
}

/** 93.5 → "93,5 h". */
export function formatarHoras(horas: number | null | undefined): string {
  if (!ehNumero(horas)) return VAZIO
  return `${numero1.format(horas)}${NBSP}h`
}

/** "SE" → "Sé", "CAMPO LIMPO" → "Campo Limpo". */
export function nomeArea(area: Area | string | null | undefined): string {
  if (!area) return VAZIO
  return NOMES_AREA[area as Area] ?? area
}

const PALAVRAS_MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o"])
const SIGLAS = new Set(["SP", "II", "III", "IV"])

/**
 * Endereço do cadastro (todo em maiúsculas, às vezes com vírgula sobrando) em caixa de título:
 * "RUA ANDREA DE FIRENZE" → "Rua Andrea de Firenze". Siglas e números ficam como vieram.
 * Vazio ou ausente → null (quem chama escolhe o texto, ex.: "sem endereço").
 * Use em toda tela que mostra endereço (mapa, popup, fila), para o mesmo poste ter o mesmo texto.
 */
export function formatarEndereco(endereco: string | null | undefined): string | null {
  const limpo = (endereco ?? "").replace(/[\s,]+$/u, "").replace(/\s+/gu, " ").trim()
  if (!limpo) return null
  return limpo
    .split(" ")
    .map((palavra, indice) => {
      if (/\d/u.test(palavra) || SIGLAS.has(palavra.replace(/[^\p{L}]/gu, ""))) return palavra
      const minuscula = palavra.toLocaleLowerCase("pt-BR")
      if (indice > 0 && PALAVRAS_MINUSCULAS.has(minuscula)) return minuscula
      return minuscula.replace(/^(\p{L})/u, (letra) => letra.toLocaleUpperCase("pt-BR"))
    })
    .join(" ")
}

export function nomeSituacao(situacao: Situacao | string | null | undefined): string {
  if (!situacao) return VAZIO
  return NOMES_SITUACAO[situacao as Situacao] ?? situacao
}

export function nomeStatus(status: StatusChamado | string | null | undefined): string {
  if (!status) return VAZIO
  return NOMES_STATUS[status as StatusChamado] ?? status
}

// ---------- Datas (relógio de parede de São Paulo) ----------

const REGEX_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/

/**
 * Lê o ISO sem fuso como milissegundos de "relógio de parede" (o horário de SP codificado como
 * se fosse UTC). Serve para comparar e somar dias sem efeito do fuso do navegador.
 */
export function lerRelogio(iso: DataHoraIso | null | undefined): number | null {
  const m = REGEX_ISO.exec(iso ?? "")
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))
}

/** "Agora" no relógio de parede de São Paulo, na mesma escala de `lerRelogio`. */
export function agoraSaoPaulo(agora: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_SP,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora)
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((p) => p.type === tipo)?.value ?? 0)
  return Date.UTC(valor("year"), valor("month") - 1, valor("day"), valor("hour"), valor("minute"), valor("second"))
}

/** Milissegundos de relógio de volta para ISO sem fuso ("2026-11-15T19:24:10"). */
export function relogioParaIso(ms: number): DataHoraIso {
  return new Date(ms).toISOString().slice(0, 19)
}

const p2 = (n: number) => String(n).padStart(2, "0")

/** "2026-11-09T19:24:10" → "09/11/2026 19:24". Sem hora no ISO → só a data. */
export function formatarDataHora(iso: DataHoraIso | null | undefined): string {
  const m = REGEX_ISO.exec(iso ?? "")
  if (!m) return iso ? String(iso) : VAZIO
  const dia = `${m[3]}/${m[2]}/${m[1]}`
  return m[4] ? `${dia} ${m[4]}:${m[5]}` : dia
}

/** "2026-11-09T19:24:10" → "09/11/2026". */
export function formatarData(iso: DataHoraIso | null | undefined): string {
  const m = REGEX_ISO.exec(iso ?? "")
  if (!m) return iso ? String(iso) : VAZIO
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Formata milissegundos de relógio (de `lerRelogio`/`agoraSaoPaulo`) como "09/11/2026 19:24". */
export function formatarRelogio(ms: number): string {
  const d = new Date(ms)
  return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
}

// ---------- Prazo de reparo ----------

export interface Prazo {
  /** Data limite (ISO sem fuso, SP): `aberto_em` + 5 dias (apagada) ou + 10 (insuficiente). */
  prazo: DataHoraIso | null
  /** true se o chamado ainda está em aberto e o prazo já passou. */
  atrasado: boolean
  /** Dias inteiros de atraso (0 se não atrasado ou atrasado há menos de 1 dia). */
  diasAtraso: number
  /** Dias inteiros até o prazo (0 no último dia ou se já venceu). */
  diasRestantes: number
}

/**
 * Prazo de reparo de um chamado, no horário de São Paulo.
 * Só chamado `aberto` ou `em_atendimento` pode estar atrasado.
 */
export function calcularPrazo(
  chamado: Pick<Chamado, "aberto_em" | "situacao_detectada" | "status">,
  agora: Date = new Date(),
): Prazo {
  const dias = PRAZO_DIAS[chamado.situacao_detectada]
  const aberto = lerRelogio(chamado.aberto_em)
  if (!dias || aberto === null) return { prazo: null, atrasado: false, diasAtraso: 0, diasRestantes: 0 }
  const limite = aberto + dias * UM_DIA_MS
  const diferenca = agoraSaoPaulo(agora) - limite
  const emAberto = STATUS_EM_ABERTO.includes(chamado.status)
  const atrasado = emAberto && diferenca > 0
  return {
    prazo: relogioParaIso(limite),
    atrasado,
    diasAtraso: atrasado ? Math.floor(diferenca / UM_DIA_MS) : 0,
    diasRestantes: diferenca < 0 ? Math.floor(-diferenca / UM_DIA_MS) : 0,
  }
}

/** Texto do badge de atraso: "Atrasado há 3 dias", "Atrasado há 1 dia", "Atrasado há menos de 1 dia". */
export function textoAtraso(diasAtraso: number): string {
  if (diasAtraso < 1) return "Atrasado há menos de 1 dia"
  return diasAtraso === 1 ? "Atrasado há 1 dia" : `Atrasado há ${diasAtraso} dias`
}

/** "1 relato", "3 relatos", "Nenhum relato". */
export function plural(n: number, singular: string, pluralTexto: string, zero?: string): string {
  if (n === 0 && zero) return zero
  return `${formatarNumero(n, 0)} ${n === 1 ? singular : pluralTexto}`
}
