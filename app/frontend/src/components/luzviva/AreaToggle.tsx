import { cn } from "@/lib/utils"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useAreaParam, VALOR_TODAS } from "@/hooks/use-area-param"
import { AREAS, NOMES_AREA, ehArea } from "@/lib/dominio"

export interface AreaToggleProps {
  /** Mostra a opção "Todas" (valor `null` em `useAreaParam({ permitirTodas: true })`). */
  permitirTodas?: boolean
  /** Nome acessível do grupo. Padrão "Área". */
  rotulo?: string
  className?: string
}

/**
 * Seletor de área-piloto (Sé, Pinheiros, Campo Limpo), ligado à URL (`?area=`).
 * Para ler a área na página use `useAreaParam()` (ou `useAreaParam({ permitirTodas: true })`
 * quando o seletor tem "Todas"): os dois leem a mesma URL.
 */
export function AreaToggle({ permitirTodas = false, rotulo = "Área", className }: AreaToggleProps) {
  const [area, definirArea] = useAreaParam({ permitirTodas })
  const valor = area ?? VALOR_TODAS
  // Abaixo de 640 px: com "Todas" (4 opções) vira grade 2 x 2 de botões separados; sem ela, as 3 dividem a
  // linha e o nome quebra em duas linhas se faltar espaço ("Campo Limpo" a 320 px). Alvos de 44 px.
  const item = cn(
    "flex-1 px-2 text-center leading-tight whitespace-normal sm:flex-none sm:px-3 sm:whitespace-nowrap",
    "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
    permitirTodas && "max-sm:rounded-lg! max-sm:border! max-sm:bg-card",
  )

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={valor}
      onValueChange={(novo) => {
        if (!novo) return // clicar na opção ativa não desmarca
        if (novo === VALOR_TODAS) definirArea(null)
        else if (ehArea(novo)) definirArea(novo)
      }}
      aria-label={rotulo}
      className={cn(
        "w-full sm:w-fit",
        permitirTodas ? "max-sm:grid max-sm:grid-cols-2 max-sm:gap-1 sm:bg-card" : "bg-card",
        className,
      )}
    >
      {AREAS.map((a) => (
        <ToggleGroupItem
          key={a}
          value={a}
          className={item}
        >
          {NOMES_AREA[a]}
        </ToggleGroupItem>
      ))}
      {permitirTodas && (
        <ToggleGroupItem
          value={VALOR_TODAS}
          className={item}
        >
          Todas
        </ToggleGroupItem>
      )}
    </ToggleGroup>
  )
}
