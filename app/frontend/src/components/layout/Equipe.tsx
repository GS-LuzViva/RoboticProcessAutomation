import { Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const INTEGRANTES = [
  { nome: "Caíque Walter Silva", rm: "RM550693" },
  { nome: "Matheus José de Lima Costa", rm: "RM551157" },
  { nome: "João Paulo Fonseca Zamperlini", rm: "RM99279" },
  { nome: "Guilherme Monteiro Espim", rm: "RM99499" },
  { nome: "Guilherme Nobre Bernardo", rm: "RM98604" },
] as const

/** Rodapé da barra lateral: projeto, equipe (popover) e aviso de dados simulados. */
export function RodapeProjeto() {
  return (
    <div className="flex flex-col items-start gap-1 px-2 text-xs text-sidebar-muted-foreground">
      <p>Projeto FIAP GS 2026.2. Parte dos dados é simulada para o piloto.</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="xs"
            className="-ml-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring"
          >
            <Users aria-hidden="true" />
            Ver equipe
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-72">
          <p className="mb-2 text-sm font-semibold">Equipe do projeto</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {INTEGRANTES.map((pessoa) => (
              <li key={pessoa.rm} className="flex items-baseline justify-between gap-3">
                <span>{pessoa.nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{pessoa.rm}</span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  )
}
