import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { cn } from "@/lib/utils"

import type { Sugestao } from "./conversa"

/**
 * O texto da sugestão com a placa desenhada como PlacaChip no meio da frase. A placa desenhada fica
 * escondida do leitor de tela (senão o nome do botão viraria "Por que a Placa IP0699800…"); o nome do
 * botão vem do `aria-label` com a frase exata que será enviada.
 */
function TextoSugestao({ sugestao }: { sugestao: Sugestao }) {
  if (!sugestao.placa) return <>{sugestao.texto}</>
  const [antes, depois = ""] = sugestao.texto.split(sugestao.placa)
  return (
    <>
      {antes}
      <span aria-hidden="true">
        <PlacaChip placa={sugestao.placa} className="mx-0.5 align-[-0.15em]" />
      </span>
      {depois}
    </>
  )
}

interface SugestoesProps {
  sugestoes: readonly Sugestao[]
  aoEscolher: (sugestao: Sugestao) => void
  desabilitado?: boolean
  titulo: string
  className?: string
}

/** Perguntas prontas: um toque preenche e envia. */
export function Sugestoes({ sugestoes, aoEscolher, desabilitado, titulo, className }: SugestoesProps) {
  return (
    <div role="group" aria-labelledby="assistente-sugestoes-titulo" className={cn("flex flex-col gap-2", className)}>
      <span id="assistente-sugestoes-titulo" className="text-sm text-muted-foreground">
        {titulo}
      </span>
      <ul className="flex flex-wrap gap-2">
        {sugestoes.map((sugestao) => (
          <li key={sugestao.texto} className="max-sm:w-full">
            <button
              type="button"
              disabled={desabilitado}
              onClick={() => aoEscolher(sugestao)}
              aria-label={sugestao.texto}
              className="inline-flex min-h-11 w-full items-center rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors outline-none hover:border-primary hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 md:min-h-9"
            >
              <span>
                <TextoSugestao sugestao={sugestao} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
