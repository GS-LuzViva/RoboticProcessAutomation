/** Cliente do TanStack Query com os padrões do app e as chaves de cache compartilhadas. */
import { QueryClient } from "@tanstack/react-query"

import { ErroApi } from "@/lib/api"
import type { Area, StatusChamado } from "@/lib/tipos"

declare module "@tanstack/react-query" {
  interface Register {
    // Toda falha de `pedir()` é ErroApi; a mensagem já vem pronta para a tela.
    defaultError: ErroApi
  }
}

/** Views do pipeline mudam 1x/dia: 60 s de cache bastam. */
export const TEMPO_FRESCO_VIEWS_MS = 60_000
/** Chamados mudam a qualquer momento (RPA e gestor): cache curto. */
export const TEMPO_FRESCO_CHAMADOS_MS = 10_000

/** Tenta de novo 1 vez, exceto quando repetir não muda nada (4xx ou view não publicada). */
function deveRepetir(tentativas: number, erro: unknown): boolean {
  if (tentativas >= 1) return false
  if (erro instanceof ErroApi && erro.tipo === "http" && (erro.status < 500 || erro.status === 503)) return false
  return true
}

export function criarClienteConsulta(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: deveRepetir,
        staleTime: TEMPO_FRESCO_VIEWS_MS,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
}

/** Chaves de cache. Use estas (e não arrays soltos) para invalidar de forma consistente. */
export const chaves = {
  luminarias: (area?: Area | null) => ["luminarias", area ?? "todas"] as const,
  fila: (area?: Area | null) => ["fila", area ?? "todas"] as const,
  painel: () => ["painel"] as const,
  chamados: (filtros: { status?: readonly StatusChamado[]; area?: Area | null; placa?: string | null } = {}) =>
    [
      "chamados",
      {
        status: filtros.status ? [...filtros.status].sort().join(",") : "todos",
        area: filtros.area ?? "todas",
        placa: filtros.placa ?? null,
      },
    ] as const,
  todosChamados: () => ["chamados"] as const,
  todasFilas: () => ["fila"] as const,
}
