/**
 * Hooks de dados do LuzViva (TanStack Query). As páginas usam só estes hooks, nunca `fetch`.
 * Erros chegam como `ErroApi` em `error` (mensagem pronta em `error.message`).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useChaveGestor } from "@/hooks/use-chave-gestor"
import { api } from "@/lib/api"
import { TEMPO_FRESCO_CHAMADOS_MS, chaves } from "@/lib/consulta"
import type { AlteracaoChamado, Area, NovoRelato, Pergunta, StatusChamado } from "@/lib/tipos"

/** Luminárias de uma área (GET /api/luminarias?subprefeitura=). `null` = todas (1.800 linhas). */
export function useLuminarias(area: Area | null) {
  return useQuery({
    queryKey: chaves.luminarias(area),
    queryFn: ({ signal }) => api.luminarias({ area: area ?? undefined }, signal),
  })
}

/** Fila de manutenção, por prioridade desc (GET /api/fila). Sem área = todas. */
export function useFila(area?: Area | null) {
  return useQuery({
    queryKey: chaves.fila(area),
    queryFn: ({ signal }) => api.fila(area ?? undefined, signal),
  })
}

/** Indicadores por área (GET /api/painel). */
export function usePainel() {
  return useQuery({
    queryKey: chaves.painel(),
    queryFn: ({ signal }) => api.painel(signal),
  })
}

/**
 * Chamados filtrados por status (GET /api/chamados?status=a,b). Lista vazia ou omitida = todos.
 * `filtros.area` e `filtros.placa` são opcionais.
 */
export function useChamados(
  statusList?: readonly StatusChamado[],
  filtros: { area?: Area | null; placa?: string | null } = {},
) {
  return useQuery({
    queryKey: chaves.chamados({ status: statusList, area: filtros.area, placa: filtros.placa }),
    queryFn: ({ signal }) =>
      api.chamados(
        { status: statusList ? [...statusList] : undefined, area: filtros.area ?? undefined, placa: filtros.placa ?? undefined },
        signal,
      ),
    staleTime: TEMPO_FRESCO_CHAMADOS_MS,
  })
}

export interface VariaveisAtualizarChamado {
  id: string
  alteracao: AlteracaoChamado
}

/**
 * PATCH /api/chamados/{id} com a chave do gestor (X-API-Key) do `GestorKeyProvider`.
 * No sucesso invalida chamados e fila. 401 = pedir a chave; 409 = transição inválida.
 */
export function useAtualizarChamado() {
  const cliente = useQueryClient()
  const { chave } = useChaveGestor()
  return useMutation({
    mutationFn: ({ id, alteracao }: VariaveisAtualizarChamado) => api.atualizarChamado(id, alteracao, chave ?? undefined),
    onSuccess: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: chaves.todosChamados() }),
        cliente.invalidateQueries({ queryKey: chaves.todasFilas() }),
      ]),
  })
}

/** POST /api/fotos (multipart, 30 s). Devolve a ocorrência gravada, com o resultado da visão. */
export function useEnviarRelato() {
  return useMutation({
    mutationFn: (relato: NovoRelato) => api.enviarRelato(relato),
  })
}

/**
 * POST /api/assistente (30 s). Nunca falha: qualquer erro resolve para
 * `{resposta: "Assistente indisponível no momento", fontes: [], recusou: true, confianca: 0}`.
 */
export function usePerguntar() {
  return useMutation({
    mutationFn: (pergunta: Pergunta) => api.perguntar(pergunta),
  })
}
