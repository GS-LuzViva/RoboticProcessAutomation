import { Camera, ChartColumn, ClipboardList, ListOrdered, Map as IconeMapa, MessageSquareText, type LucideIcon } from "lucide-react"

export interface ItemNavegacao {
  /** Caminho dentro do HashRouter (`#/fila`). */
  caminho: string
  /** Nome curto no menu. */
  rotulo: string
  /** Título da página (h1 e `document.title`: "Fila de manutenção | LuzViva"). */
  titulo: string
  icone: LucideIcon
  /** A tela usa o seletor de área: o link do menu leva junto o `?area=` atual. */
  usaArea: boolean
}

/** Telas do app, na ordem do menu. */
export const NAVEGACAO: readonly ItemNavegacao[] = [
  { caminho: "/", rotulo: "Mapa", titulo: "Mapa das luminárias", icone: IconeMapa, usaArea: true },
  { caminho: "/fila", rotulo: "Fila", titulo: "Fila de manutenção", icone: ListOrdered, usaArea: true },
  { caminho: "/chamados", rotulo: "Chamados", titulo: "Chamados de manutenção", icone: ClipboardList, usaArea: true },
  { caminho: "/painel", rotulo: "Painel", titulo: "Painel por subprefeitura", icone: ChartColumn, usaArea: false },
  { caminho: "/relatar", rotulo: "Relatar", titulo: "Relatar problema no poste", icone: Camera, usaArea: false },
  { caminho: "/assistente", rotulo: "Assistente", titulo: "Assistente da fila", icone: MessageSquareText, usaArea: false },
]

/** Título da tela de um caminho (para o h1 dos placeholders e o `document.title`). */
export function tituloDaRota(caminho: string): string {
  return NAVEGACAO.find((item) => item.caminho === caminho)?.titulo ?? "Página não encontrada"
}
