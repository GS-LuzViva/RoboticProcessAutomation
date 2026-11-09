import { useCallback, useEffect, useRef, useState, type ChangeEvent, type Ref } from "react"
import { Camera, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

import { erroDaFoto, formatarTamanho, TIPOS_FOTO } from "./relato"

interface CampoFotoProps {
  id: string
  foto: File | null
  erro?: string
  aoEscolher: (foto: File | null, erro: string | null) => void
  inputRef?: Ref<HTMLInputElement>
  desabilitado?: boolean
}

/**
 * Miniatura por object URL: criado quando a pessoa escolhe a foto, revogado na troca e ao desmontar
 * (o formulário remonta em "Relatar outro poste").
 */
function useMiniatura() {
  const [url, setUrl] = useState<string | null>(null)
  const atual = useRef<string | null>(null)
  const trocar = useCallback((arquivo: File | null) => {
    if (atual.current) URL.revokeObjectURL(atual.current)
    atual.current = arquivo ? URL.createObjectURL(arquivo) : null
    setUrl(atual.current)
  }, [])
  useEffect(
    () => () => {
      if (atual.current) URL.revokeObjectURL(atual.current)
      atual.current = null
    },
    [],
  )
  return [url, trocar] as const
}

/**
 * Foto do poste: área grande de toque (abre a câmera traseira no celular) e, depois de escolhida,
 * a miniatura com "Trocar foto". O input fica visualmente escondido, mas é ele que recebe o foco.
 */
export function CampoFoto({ id, foto, erro, aoEscolher, inputRef, desabilitado }: CampoFotoProps) {
  const [url, trocarMiniatura] = useMiniatura()
  const [semMiniatura, setSemMiniatura] = useState(false)
  const idTitulo = `${id}-titulo`
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`

  const escolher = (evento: ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0] ?? null
    // Limpa o valor para que escolher o mesmo arquivo de novo também dispare o change.
    evento.target.value = ""
    if (!arquivo) return
    const problema = erroDaFoto(arquivo)
    trocarMiniatura(problema ? null : arquivo)
    setSemMiniatura(false)
    aoEscolher(problema ? null : arquivo, problema)
  }

  // O input escondido recebe o foco; o anel aparece no rótulo visível que o representa.
  const anelDeFoco =
    "group-has-[input:focus-visible]/foto:border-ring group-has-[input:focus-visible]/foto:ring-3 group-has-[input:focus-visible]/foto:ring-ring"

  return (
    <div className="group/foto flex flex-col gap-2">
      <span id={idTitulo} className="text-sm font-semibold">
        Foto do poste
      </span>
      <p id={idDica} className="text-sm text-muted-foreground">
        Enquadre a luminária e, se der, a placa amarela. JPEG ou PNG de até 5 MB.
      </p>

      {/* Um único input: a área grande (sem foto) e o "Trocar foto" (com foto) são rótulos dele. */}
      <input
        ref={inputRef}
        id={id}
        name="foto"
        type="file"
        accept={TIPOS_FOTO.join(",")}
        capture="environment"
        className="sr-only"
        aria-labelledby={idTitulo}
        aria-describedby={erro ? `${idDica} ${idErro}` : idDica}
        aria-invalid={erro ? true : undefined}
        disabled={desabilitado}
        onChange={escolher}
      />

      {foto && url ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          {semMiniatura ? (
            <span className="flex aspect-[4/3] w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-center text-xs text-muted-foreground sm:w-40">
              Sem prévia
            </span>
          ) : (
            <img
              src={url}
              alt="Miniatura da foto escolhida"
              width={160}
              height={120}
              onError={() => setSemMiniatura(true)}
              className="aspect-[4/3] w-24 shrink-0 rounded-lg bg-muted object-cover sm:w-40"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="min-w-0 text-sm">
              <span className="block truncate font-semibold" title={foto.name}>
                {foto.name}
              </span>
              <span className="text-muted-foreground">{formatarTamanho(foto.size)}</span>
            </p>
            <label
              htmlFor={id}
              className={cn(
                "inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-semibold hover:bg-muted max-md:h-11 max-sm:w-full dark:border-input dark:bg-input/30",
                desabilitado ? "pointer-events-none opacity-50" : "cursor-pointer",
                anelDeFoco,
              )}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Trocar foto
            </label>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-card px-4 py-6 text-center transition-colors hover:border-primary hover:bg-primary/5",
            erro && "border-destructive",
            desabilitado ? "pointer-events-none opacity-50" : "cursor-pointer",
            anelDeFoco,
          )}
        >
          <Camera aria-hidden="true" className="size-8 text-primary" />
          <span className="font-semibold text-primary">Tirar ou escolher foto</span>
          <span className="text-xs text-muted-foreground">Toque aqui para abrir a câmera</span>
        </label>
      )}

      {erro && (
        <p id={idErro} className="text-sm font-semibold text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
}
