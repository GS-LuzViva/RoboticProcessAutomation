import { useEffect, useRef, useState, type FormEvent } from "react"
import { CircleAlert, LoaderCircle, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEnviarRelato } from "@/hooks/use-api"
import { ErroApi, mensagemDeErro } from "@/lib/api"
import { AREAS, NOMES_AREA, ehArea, placaValida } from "@/lib/dominio"
import type { Area, CategoriaOcorrencia, Ocorrencia } from "@/lib/tipos"

import { CampoFoto } from "./CampoFoto"
import { CampoLocalizacao } from "./CampoLocalizacao"
import { PrevisaoPlaca } from "./PrevisaoPlaca"
import {
  OPCOES_PROBLEMA,
  ORDEM_CAMPOS,
  placaDigitada,
  validarRelato,
  type CampoRelato,
  type DadosRelato,
  type ErrosRelato,
  type Localizacao,
} from "./relato"

interface FormularioRelatoProps {
  placaInicial?: string
  areaInicial?: Area
  aoEnviar: (ocorrencia: Ocorrencia) => void
}

const ID = {
  placa: "relato-placa",
  foto: "relato-foto",
  categoria: "relato-problema",
  area: "relato-area",
} as const satisfies Record<CampoRelato, string>

const idErro = (campo: CampoRelato) => `${ID[campo]}-erro`

function ErroCampo({ campo, erro }: { campo: CampoRelato; erro?: string }) {
  if (!erro) return null
  return (
    <p id={idErro(campo)} className="text-sm font-semibold text-destructive">
      {erro}
    </p>
  )
}

/** Formulário do relato, pensado para celular à noite: uma coluna, alvos grandes, erro no campo. */
export function FormularioRelato({ placaInicial = "", areaInicial, aoEnviar }: FormularioRelatoProps) {
  const enviar = useEnviarRelato()
  const enviando = enviar.isPending

  const [dados, setDados] = useState<DadosRelato>({
    placa: placaDigitada(placaInicial),
    foto: null,
    categoria: "luminaria_apagada",
    area: areaInicial ?? "",
    localizacao: null,
  })
  const [erros, setErros] = useState<ErrosRelato>({})

  const refPlaca = useRef<HTMLInputElement>(null)
  const refFoto = useRef<HTMLInputElement>(null)
  const refArea = useRef<HTMLButtonElement>(null)
  const refProblema = useRef<HTMLDivElement>(null)

  const alterar = <K extends keyof DadosRelato>(campo: K, valor: DadosRelato[K]) => {
    setDados((atual) => ({ ...atual, [campo]: valor }))
    // O aviso de falha do envio anterior deixa de valer quando a pessoa corrige algo.
    if (enviar.isError) enviar.reset()
  }
  const limparErro = (...campos: CampoRelato[]) => {
    setErros((atual) => {
      if (!campos.some((campo) => atual[campo])) return atual
      const proximo = { ...atual }
      for (const campo of campos) delete proximo[campo]
      return proximo
    })
  }

  const focar = (campo: CampoRelato) => {
    if (campo === "placa") refPlaca.current?.focus()
    else if (campo === "foto") refFoto.current?.focus()
    else if (campo === "area") refArea.current?.focus()
    else {
      const grupo = refProblema.current
      const radio =
        grupo?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
        grupo?.querySelector<HTMLElement>('[role="radio"]')
      radio?.focus()
    }
  }

  const submeter = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    const novosErros = validarRelato(dados)
    setErros(novosErros)
    const primeiro = ORDEM_CAMPOS.find((campo) => novosErros[campo])
    if (primeiro) {
      focar(primeiro)
      return
    }
    enviar.mutate(
      {
        foto: dados.foto as File,
        categoria: dados.categoria as CategoriaOcorrencia,
        placa: dados.placa || undefined,
        area_piloto: dados.area || undefined,
        lat: dados.localizacao?.lat,
        lon: dados.localizacao?.lon,
      },
      {
        onSuccess: aoEnviar,
        onError: (erro) => {
          // Foto recusada pelo servidor: o erro também aparece no campo da foto.
          if (erro instanceof ErroApi && (erro.status === 413 || erro.status === 415)) {
            setErros((atual) => ({
              ...atual,
              foto:
                erro.status === 413
                  ? "A foto é grande demais para o servidor. Tire outra com resolução menor."
                  : "O servidor não reconheceu o arquivo como foto JPEG ou PNG. Escolha outra foto.",
            }))
          }
        },
      },
    )
  }

  // Foto escolhida ou placa digitada e ainda não enviada: o navegador confirma antes de recarregar ou fechar
  // a aba. Depois do envio o formulário sai da tela e o aviso some junto.
  const temRascunho = Boolean(dados.foto) || (dados.placa !== "" && dados.placa !== placaDigitada(placaInicial))
  useEffect(() => {
    if (!temRascunho) return
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault()
    }
    window.addEventListener("beforeunload", avisar)
    return () => window.removeEventListener("beforeunload", avisar)
  }, [temRascunho])

  const descricao = (campo: CampoRelato, ...outros: string[]) =>
    [...outros, erros[campo] ? idErro(campo) : null].filter(Boolean).join(" ") || undefined

  const placaCompleta = placaValida(dados.placa)

  return (
    <form
      noValidate
      onSubmit={submeter}
      aria-busy={enviando}
      aria-label="Relato de poste com problema"
      className="flex max-w-xl flex-col gap-6 max-md:gap-5"
    >
      {/* 1. Placa, com a prévia ao vivo */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={ID.placa} className="font-semibold">
          Placa do poste
        </Label>
        <PrevisaoPlaca placa={dados.placa} />
        <Input
          ref={refPlaca}
          id={ID.placa}
          name="placa"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          pattern="IP[0-9]{7}"
          placeholder="IP0723371…"
          value={dados.placa}
          disabled={enviando}
          aria-invalid={erros.placa ? true : undefined}
          aria-describedby={descricao("placa", "relato-placa-dica")}
          onChange={(evento) => {
            const placa = placaDigitada(evento.target.value)
            alterar("placa", placa)
            if (placaValida(placa)) limparErro("placa", "area")
          }}
          onBlur={() => {
            if (dados.placa && !placaCompleta) {
              setErros((atual) => ({ ...atual, placa: "A placa tem IP e 7 números, por exemplo IP0723371." }))
            }
          }}
          className={cn(
            "h-11 font-semibold tracking-wide uppercase tabular-nums md:text-base",
            placaCompleta && "border-ok",
          )}
        />
        <p id="relato-placa-dica" className="text-sm text-muted-foreground">
          A placa pintada no poste, por exemplo IP0723371.
        </p>
        <ErroCampo campo="placa" erro={erros.placa} />
      </div>

      {/* 2. Foto */}
      <CampoFoto
        id={ID.foto}
        inputRef={refFoto}
        foto={dados.foto}
        erro={erros.foto}
        desabilitado={enviando}
        aoEscolher={(foto, problema) => {
          alterar("foto", foto)
          setErros((atual) => {
            const proximo = { ...atual }
            if (problema) proximo.foto = problema
            else delete proximo.foto
            return proximo
          })
        }}
      />

      {/* 3. O que está acontecendo */}
      <div className="flex flex-col gap-2">
        <span id="relato-problema-titulo" className="text-sm font-semibold">
          O que está acontecendo
        </span>
        <RadioGroup
          ref={refProblema}
          id={ID.categoria}
          name="categoria"
          value={dados.categoria}
          disabled={enviando}
          onValueChange={(valor) => {
            alterar("categoria", valor as CategoriaOcorrencia)
            limparErro("categoria")
          }}
          aria-labelledby="relato-problema-titulo"
          aria-describedby={descricao("categoria")}
          aria-invalid={erros.categoria ? true : undefined}
          className="grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {OPCOES_PROBLEMA.map(({ valor, rotulo, icone: Icone }) => {
            const idOpcao = `relato-problema-${valor}`
            return (
              <Label
                key={valor}
                htmlFor={idOpcao}
                className="min-h-12 cursor-pointer gap-3 rounded-lg border bg-card px-3 py-2.5 text-base font-normal leading-snug transition-colors hover:bg-muted has-data-checked:border-primary has-data-checked:bg-primary/8 has-data-checked:font-semibold has-[button:focus-visible]:ring-3 has-[button:focus-visible]:ring-ring"
              >
                <RadioGroupItem id={idOpcao} value={valor} className="focus-visible:ring-0" />
                <Icone aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                {rotulo}
              </Label>
            )
          })}
        </RadioGroup>
        <ErroCampo campo="categoria" erro={erros.categoria} />
      </div>

      {/* 4. Área */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={ID.area} className="font-semibold">
          Área
        </Label>
        <p id="relato-area-dica" className="-mt-1 text-sm text-muted-foreground">
          Opcional quando você informa a placa: a área vem do cadastro do poste.
        </p>
        <Select
          name="area_piloto"
          value={dados.area}
          disabled={enviando}
          onValueChange={(valor) => {
            if (ehArea(valor)) alterar("area", valor)
            limparErro("area")
          }}
        >
          <SelectTrigger
            ref={refArea}
            id={ID.area}
            aria-invalid={erros.area ? true : undefined}
            aria-describedby={descricao("area", "relato-area-dica")}
            className="h-11 w-full text-base sm:w-64 md:text-sm"
          >
            <SelectValue placeholder="Escolha a área" />
          </SelectTrigger>
          <SelectContent>
            {AREAS.map((area) => (
              <SelectItem key={area} value={area} className="min-h-11 md:min-h-9">
                {NOMES_AREA[area]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ErroCampo campo="area" erro={erros.area} />
      </div>

      {/* 5. Localização */}
      <CampoLocalizacao
        localizacao={dados.localizacao}
        desabilitado={enviando}
        aoMudar={(localizacao: Localizacao | null) => {
          alterar("localizacao", localizacao)
          if (localizacao && !dados.placa) limparErro("placa")
        }}
      />

      {/* Privacidade (LGPD) */}
      <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ok" />
        <span>
          O relato leva só a foto (sem os metadados), a placa e, se você permitir, a localização aproximada. Nome e
          e-mail não são pedidos. Os dados servem apenas para a equipe confirmar a falha e consertar a iluminação.
        </span>
      </p>

      {enviar.isError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>O relato não foi enviado</AlertTitle>
          <AlertDescription>{mensagemDeErro(enviar.error)}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" disabled={enviando} aria-busy={enviando} className="h-11 w-full text-base sm:w-fit sm:px-6">
        {enviando && <LoaderCircle aria-hidden="true" className="animate-spin" />}
        {enviando ? "Enviando relato…" : "Enviar relato"}
      </Button>
    </form>
  )
}
