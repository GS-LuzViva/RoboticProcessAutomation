import { cn } from "@/lib/utils"

/**
 * Marca do LuzViva: uma plaquinha amarela (como a placa ILUME do poste) com "LV" e o nome.
 * Desenhada em CSS, sem imagem. O amarelo só aparece aqui e na PlacaChip.
 */
export function MarcaLuzViva({ compacta = false, className }: { compacta?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        translate="no"
        className="inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-placa border-[1.5px] border-placa-borda bg-placa font-placa text-base leading-none font-bold text-placa-foreground"
      >
        LV
      </span>
      <span className="flex flex-col leading-tight">
        <span translate="no" className="text-base font-bold text-sidebar-foreground">LuzViva</span>
        {!compacta && <span className="text-xs text-sidebar-muted-foreground">Iluminação pública em SP</span>}
      </span>
    </span>
  )
}
