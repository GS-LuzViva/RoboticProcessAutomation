/** Abas, ordem e prazo dos chamados (só desta tela). */
import { STATUS_EM_ABERTO } from "@/lib/dominio"
import { calcularPrazo, type Prazo } from "@/lib/formatar"
import type { Chamado, StatusChamado } from "@/lib/tipos"

export type Aba = "em_aberto" | "concluidos" | "cancelados" | "todos"

export interface DefinicaoAba {
  valor: Aba
  rotulo: string
  /** Status mostrados na aba (vazio = todos). */
  status: readonly StatusChamado[]
  /** Texto do estado vazio ("Nenhum chamado em aberto nesta área"). */
  vazio: string
}

export const ABAS: readonly DefinicaoAba[] = [
  { valor: "em_aberto", rotulo: "Em aberto", status: STATUS_EM_ABERTO, vazio: "Nenhum chamado em aberto" },
  { valor: "concluidos", rotulo: "Concluídos", status: ["concluido"], vazio: "Nenhum chamado concluído" },
  { valor: "cancelados", rotulo: "Cancelados", status: ["cancelado"], vazio: "Nenhum chamado cancelado" },
  { valor: "todos", rotulo: "Todos", status: [], vazio: "Nenhum chamado" },
]

export const ABA_PADRAO: Aba = "em_aberto"

export function lerAba(valor: string | null): Aba {
  return ABAS.find((aba) => aba.valor === valor)?.valor ?? ABA_PADRAO
}

export function chamadosDaAba(chamados: readonly ChamadoComPrazo[], aba: DefinicaoAba): ChamadoComPrazo[] {
  if (aba.status.length === 0) return [...chamados]
  return chamados.filter((item) => aba.status.includes(item.chamado.status))
}

export interface ChamadoComPrazo {
  chamado: Chamado
  prazo: Prazo
  emAberto: boolean
}

/**
 * Calcula o prazo uma vez por chamado e ordena: atrasados primeiro (mais atrasado antes), depois
 * prioridade desc e, no empate, o aberto há mais tempo.
 */
export function prepararChamados(chamados: readonly Chamado[], agora: Date = new Date()): ChamadoComPrazo[] {
  return chamados
    .map((chamado) => ({
      chamado,
      prazo: calcularPrazo(chamado, agora),
      emAberto: STATUS_EM_ABERTO.includes(chamado.status),
    }))
    .sort((a, b) => {
      if (a.prazo.atrasado !== b.prazo.atrasado) return a.prazo.atrasado ? -1 : 1
      if (a.prazo.atrasado && a.prazo.diasAtraso !== b.prazo.diasAtraso) return b.prazo.diasAtraso - a.prazo.diasAtraso
      if (a.chamado.prioridade !== b.chamado.prioridade) return b.chamado.prioridade - a.chamado.prioridade
      return a.chamado.aberto_em.localeCompare(b.chamado.aberto_em)
    })
}

/** "Vence em menos de 1 dia", "1 dia restante", "4 dias restantes". */
export function textoDiasRestantes(dias: number): string {
  if (dias <= 0) return "Vence em menos de 1 dia"
  return dias === 1 ? "1 dia restante" : `${dias} dias restantes`
}
