import { useState, type FormEvent, type KeyboardEvent, type RefObject } from "react"
import { LoaderCircle, SendHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { normalizarPlaca, placaValida } from "@/lib/dominio"

const LIMITE_PERGUNTA = 2000

interface FormularioPerguntaProps {
  pergunta: string
  aoMudarPergunta: (texto: string) => void
  placa: string
  aoMudarPlaca: (placa: string) => void
  aoEnviar: (pergunta: string, placa?: string) => void
  ocupado: boolean
  refPergunta: RefObject<HTMLTextAreaElement | null>
}

type Erros = { pergunta?: string; placa?: string }

/** Caixa de pergunta: Enter envia, Shift+Enter quebra a linha; placa opcional. */
export function FormularioPergunta({
  pergunta,
  aoMudarPergunta,
  placa,
  aoMudarPlaca,
  aoEnviar,
  ocupado,
  refPergunta,
}: FormularioPerguntaProps) {
  const [erros, setErros] = useState<Erros>({})
  const placaOk = placaValida(placa)

  // Uma pergunta enviada por fora do formulário (sugestão, "Perguntar de novo") também vale como envio:
  // os erros do envio anterior deixam de valer.
  const [ocupadoAntes, setOcupadoAntes] = useState(ocupado)
  if (ocupado !== ocupadoAntes) {
    setOcupadoAntes(ocupado)
    if (ocupado && (erros.pergunta || erros.placa)) setErros({})
  }

  const enviar = () => {
    if (ocupado) return
    const texto = pergunta.trim()
    const novos: Erros = {}
    if (!texto) novos.pergunta = "Escreva a pergunta antes de enviar."
    if (placa && !placaOk) novos.placa = "A placa tem IP e 7 números, por exemplo IP0723371. Ou deixe em branco."
    setErros(novos)
    if (novos.pergunta) {
      refPergunta.current?.focus()
      return
    }
    if (novos.placa) {
      document.getElementById("assistente-placa")?.focus()
      return
    }
    aoEnviar(texto, placa || undefined)
  }

  const submeter = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    enviar()
  }

  const teclar = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault()
      enviar()
    }
  }

  return (
    <form
      noValidate
      onSubmit={submeter}
      aria-busy={ocupado}
      aria-label="Pergunta ao assistente"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="assistente-pergunta" className="font-semibold">
          Sua pergunta
        </Label>
        <Textarea
          ref={refPergunta}
          id="assistente-pergunta"
          name="pergunta"
          rows={3}
          maxLength={LIMITE_PERGUNTA}
          autoComplete="off"
          placeholder="Por exemplo: qual o prazo de reparo da IP0723371…"
          value={pergunta}
          onChange={(evento) => {
            aoMudarPergunta(evento.target.value)
            if (erros.pergunta) setErros((atual) => ({ ...atual, pergunta: undefined }))
          }}
          onKeyDown={teclar}
          aria-invalid={erros.pergunta ? true : undefined}
          aria-describedby={cn("assistente-pergunta-dica", erros.pergunta && "assistente-pergunta-erro")}
          className="max-h-60 min-h-20 text-base md:text-sm"
        />
        <p id="assistente-pergunta-dica" className="text-xs text-muted-foreground max-md:sr-only">
          Enter envia. Shift+Enter quebra a linha.
        </p>
        {erros.pergunta && (
          <p id="assistente-pergunta-erro" className="text-sm font-semibold text-destructive">
            {erros.pergunta}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Label htmlFor="assistente-placa" className="font-semibold">
            Placa <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="assistente-placa"
              name="placa"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              pattern="IP[0-9]{7}"
              placeholder="IP0723371…"
              value={placa}
              onChange={(evento) => {
                aoMudarPlaca(normalizarPlaca(evento.target.value).slice(0, 9))
                if (erros.placa) setErros((atual) => ({ ...atual, placa: undefined }))
              }}
              aria-invalid={erros.placa ? true : undefined}
              aria-describedby={erros.placa ? "assistente-placa-erro" : undefined}
              className="w-40 uppercase tabular-nums"
            />
            {placaOk && <PlacaChip placa={placa} size="md" />}
          </div>
          {erros.placa && (
            <p id="assistente-placa-erro" className="text-sm font-semibold text-destructive">
              {erros.placa}
            </p>
          )}
        </div>

        <Button type="submit" disabled={ocupado} aria-busy={ocupado} className="max-sm:w-full">
          {ocupado ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <SendHorizontal aria-hidden="true" />}
          Enviar pergunta
        </Button>
      </div>
    </form>
  )
}
