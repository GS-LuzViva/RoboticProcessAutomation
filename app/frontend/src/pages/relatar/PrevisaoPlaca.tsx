import { CircleCheck } from "lucide-react"

import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { placaValida } from "@/lib/dominio"

import { algarismosQueFaltam } from "./relato"

/**
 * Prévia ao vivo da placa (o momento-assinatura do DESIGN.md): o poste à noite, em faixa escura,
 * com a placa amarela pintada nele, desenhada algarismo por algarismo enquanto a pessoa digita.
 * É só visual: o campo de texto logo abaixo é o que o leitor de tela usa.
 */
export function PrevisaoPlaca({ placa }: { placa: string }) {
  const completa = placaValida(placa)
  const faltam = algarismosQueFaltam(placa)
  const legenda = completa
    ? "Placa completa"
    : faltam === 7
      ? "Digite os 7 números da placa"
      : faltam === 1
        ? "Falta 1 número"
        : `Faltam ${faltam} números`

  return (
    <div
      aria-hidden="true"
      className="relative isolate flex h-36 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-sidebar px-4 select-none dark:border dark:border-sidebar-border"
    >
      {/* O poste: uma coluna vertical atrás da placa. */}
      <div className="absolute inset-y-0 left-1/2 -z-10 w-16 -translate-x-1/2 bg-sidebar-accent" />
      <div className="absolute inset-y-0 left-1/2 -z-10 ml-5 w-1 bg-sidebar-border" />
      <PlacaChip placa={placa} size="lg" completar className="max-w-full" />
      <p className="flex items-center gap-1.5 rounded-md bg-sidebar/80 px-2 text-xs text-sidebar-muted-foreground">
        {completa && <CircleCheck className="size-3.5 text-ok-mapa" />}
        {legenda}
      </p>
    </div>
  )
}
