import { useId } from "react"
import { Monitor, Moon, Sun } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTema } from "@/hooks/use-tema"
import type { PreferenciaTema } from "@/lib/tema"

const OPCOES: { valor: PreferenciaTema; rotulo: string; icone: typeof Sun }[] = [
  { valor: "claro", rotulo: "Claro", icone: Sun },
  { valor: "escuro", rotulo: "Escuro", icone: Moon },
  { valor: "sistema", rotulo: "Sistema", icone: Monitor },
]

/** Seletor de tema (claro, escuro, sistema) para a barra lateral escura. */
export function AlternarTema() {
  const { preferencia, definirPreferencia } = useTema()
  const idRotulo = useId()
  return (
    <div className="flex flex-col gap-1.5 px-2">
      <span id={idRotulo} className="text-xs text-sidebar-muted-foreground">
        Tema
      </span>
      <ToggleGroup
        type="single"
        size="sm"
        spacing={0}
        value={preferencia}
        onValueChange={(valor) => {
          if (valor) definirPreferencia(valor as PreferenciaTema)
        }}
        aria-labelledby={idRotulo}
        className="w-full rounded-md border border-sidebar-border"
      >
        {OPCOES.map(({ valor, rotulo, icone: Icone }) => (
          <ToggleGroupItem
            key={valor}
            value={valor}
            className="flex-1 gap-1 text-xs text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring data-[state=on]:bg-sidebar-accent data-[state=on]:text-sidebar-accent-foreground"
          >
            <Icone aria-hidden="true" />
            {rotulo}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
