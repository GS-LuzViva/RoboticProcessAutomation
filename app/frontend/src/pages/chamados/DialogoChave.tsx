import { useId, useRef, useState, type FormEvent } from "react"
import { KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useChaveGestor } from "@/hooks/use-chave-gestor"

/** Por que o diálogo abriu: pelo botão do cabeçalho ou porque o servidor respondeu 401. */
export type MotivoChave = "manual" | "faltando" | "recusada"

export interface DialogoChaveProps {
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  motivo: MotivoChave
  /** Chamado depois de salvar (a página refaz a troca de status que esperava a chave). */
  aoSalvar?: () => void
  /** Ao fechar: devolve o foco a quem abriu (o diálogo abre por código, sem DialogTrigger). */
  aoDevolverFoco?: (evento: Event) => void
}

const AVISOS: Record<MotivoChave, string | null> = {
  manual: null,
  faltando: "Mudar o status de um chamado exige a chave do gestor. Informe a chave para continuar.",
  recusada: "O servidor recusou a chave informada. Confira a chave e informe de novo.",
}

/** Formulário da chave do gestor. A chave fica só na memória desta aba (nunca no navegador ou na URL). */
function FormularioChave({ motivo, aoSalvar, aoFechar }: { motivo: MotivoChave; aoSalvar?: () => void; aoFechar: () => void }) {
  const { chave, definirChave } = useChaveGestor()
  const [texto, setTexto] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const idCampo = useId()
  const idErro = useId()
  const refCampo = useRef<HTMLInputElement>(null)
  const aviso = AVISOS[motivo]

  const salvar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!texto.trim()) {
      setErro("Informe a chave do gestor.")
      refCampo.current?.focus()
      return
    }
    definirChave(texto)
    aoFechar()
    aoSalvar?.()
  }

  return (
    <form onSubmit={salvar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound aria-hidden="true" className="size-4 text-muted-foreground" />
          Chave do gestor
        </DialogTitle>
        <DialogDescription>
          {aviso ?? "Necessária para mudar o status de um chamado."} A chave fica só na memória desta aba: some ao
          recarregar ou fechar a página.
        </DialogDescription>
      </DialogHeader>

      {chave && motivo === "manual" && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">Uma chave já está informada nesta aba.</p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor={idCampo}>{chave ? "Nova chave" : "Chave"}</Label>
        <Input
          ref={refCampo}
          id={idCampo}
          name="chave"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
            if (erro) setErro(null)
          }}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
        />
        {erro && (
          <p id={idErro} className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>

      <DialogFooter>
        {chave && (
          <Button
            type="button"
            variant="ghost"
            className="sm:mr-auto"
            onClick={() => {
              definirChave(null)
              aoFechar()
            }}
          >
            Remover chave
          </Button>
        )}
        <Button type="button" variant="outline" onClick={aoFechar}>
          Voltar
        </Button>
        <Button type="submit">Salvar chave</Button>
      </DialogFooter>
    </form>
  )
}

export function DialogoChave({ aberto, aoMudarAberto, motivo, aoSalvar, aoDevolverFoco }: DialogoChaveProps) {
  // Nova sessão a cada abertura: o formulário remonta com o campo e o erro limpos, mas continua
  // na tela durante a animação de saída.
  const [sessao, setSessao] = useState(0)
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    if (aberto) setSessao((atual) => atual + 1)
  }
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={aoDevolverFoco}>
        <FormularioChave key={sessao} motivo={motivo} aoSalvar={aoSalvar} aoFechar={() => aoMudarAberto(false)} />
      </DialogContent>
    </Dialog>
  )
}
