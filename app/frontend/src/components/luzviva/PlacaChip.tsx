import type { ReactNode } from "react"
import { Link } from "react-router"
import { cn } from "@/lib/utils"

type TamanhoPlaca = "sm" | "md" | "lg"

const TAMANHOS: Record<TamanhoPlaca, string> = {
  sm: "h-5 gap-[0.12em] border px-1 text-[0.9375rem] leading-none",
  md: "h-7 gap-[0.14em] border-[1.5px] px-1.5 text-xl leading-none",
  lg: "h-16 gap-[0.16em] border-2 px-3 text-[2.75rem] leading-none tracking-[0.02em] shadow-[inset_0_0_0_3px_var(--placa),inset_0_0_0_4px_var(--placa-borda)]",
}

export interface PlacaChipProps {
  /** Placa ILUME (ex.: "IP0723371"). null ou vazio mostra "sem placa". */
  placa: string | null | undefined
  /** sm: tabelas e listas; md: detalhes; lg: prévia ao vivo do formulário de relato. */
  size?: TamanhoPlaca
  /** Rota interna (react-router, ex.: "/fila?area=SE") para a placa virar link. */
  to?: string
  /** URL externa ou âncora para a placa virar link (prefira `to` para telas do app). */
  href?: string
  /**
   * Completa os algarismos que faltam com traços apagados, para a prévia ao vivo
   * ("IP07" aparece como "IP07_____"). O texto lido pelo leitor de tela continua o digitado.
   */
  completar?: boolean
  className?: string
}

const TAMANHO_PLACA = 9 // "IP" + 7 algarismos

function Conteudo({ texto, completar }: { texto: string; completar: boolean }): ReactNode {
  const prefixo = texto.slice(0, 2)
  const numero = texto.slice(2)
  const faltam = completar ? Math.max(0, TAMANHO_PLACA - Math.max(texto.length, 2)) : 0
  return (
    <>
      <span>{prefixo}</span>
      <span>
        {numero}
        {faltam > 0 && <span className="opacity-30">{"_".repeat(faltam)}</span>}
      </span>
    </>
  )
}

/**
 * Miniatura da placa pintada no poste (elemento-assinatura do DESIGN.md): algarismos condensados
 * em negrito, preto sobre amarelo, borda fina e canto quase reto. O leitor de tela lê
 * "Placa IP0723371". Use em toda placa da interface.
 */
export function PlacaChip({ placa, size = "sm", to, href, completar = false, className }: PlacaChipProps) {
  const texto = (placa ?? "").trim().toUpperCase()

  if (!texto && !completar) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-placa border border-dashed border-border px-1.5 text-xs text-muted-foreground",
          size === "lg" ? "h-16 px-3 text-base" : size === "md" ? "h-7" : "h-5",
          className,
        )}
      >
        sem placa
      </span>
    )
  }

  const classes = cn(
    "inline-flex w-fit shrink-0 items-center justify-center rounded-placa border-placa-borda bg-placa font-placa font-bold whitespace-nowrap text-placa-foreground",
    TAMANHOS[size],
    to || href
      ? "underline-offset-2 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      : "select-all",
    className,
  )
  // aria-label no próprio elemento: o leitor de tela diz "Placa IP0723371" e copiar o texto
  // continua dando só "IP0723371".
  const rotulo = texto ? `Placa ${texto}` : "Placa ainda não informada"
  const visual = <Conteudo texto={completar ? texto || "IP" : texto} completar={completar} />

  if (to) {
    return (
      <Link to={to} translate="no" className={classes} aria-label={rotulo}>
        {visual}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} translate="no" className={classes} aria-label={rotulo}>
        {visual}
      </a>
    )
  }
  return (
    <span role="img" translate="no" aria-label={rotulo} className={classes}>
      {visual}
    </span>
  )
}
