import { useState } from "react"
import { LoaderCircle, LocateFixed, MapPin, X } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { Localizacao } from "./relato"

type EstadoGeo = "parado" | "pedindo" | "negada" | "falhou"

interface CampoLocalizacaoProps {
  localizacao: Localizacao | null
  aoMudar: (localizacao: Localizacao | null) => void
  desabilitado?: boolean
}

/** 4 casas decimais (cerca de 11 m): aproximada, suficiente para a equipe achar o poste. */
const arredondar = (valor: number) => Math.round(valor * 10_000) / 10_000
const formato4 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })

/** Localização opcional: pede ao navegador só quando a pessoa toca no botão. */
export function CampoLocalizacao({ localizacao, aoMudar, desabilitado }: CampoLocalizacaoProps) {
  const [estado, setEstado] = useState<EstadoGeo>("parado")
  const suportada = typeof navigator !== "undefined" && "geolocation" in navigator

  const pedir = () => {
    setEstado("pedindo")
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setEstado("parado")
        aoMudar({ lat: arredondar(posicao.coords.latitude), lon: arredondar(posicao.coords.longitude) })
      },
      (erro) => setEstado(erro.code === erro.PERMISSION_DENIED ? "negada" : "falhou"),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  const remover = () => {
    aoMudar(null)
    setEstado("parado")
  }

  let status: string | null = null
  if (!suportada) status = "Este navegador não informa a localização. Tudo bem: a placa basta."
  else if (estado === "pedindo") status = "Pedindo a localização ao navegador…"
  else if (estado === "negada") status = "Sem permissão para a localização. Tudo bem: a placa basta."
  else if (estado === "falhou") status = "Não deu para obter a localização agora. Tente de novo ou envie só com a placa."

  return (
    <div role="group" aria-labelledby="relato-local-titulo" className="flex flex-col gap-2">
      <span id="relato-local-titulo" className="text-sm font-semibold">
        Localização <span className="font-normal text-muted-foreground">(opcional)</span>
      </span>
      <p className="text-sm text-muted-foreground">
        Ajuda quando não dá para ler a placa. Vai só a posição aproximada, com cerca de 10 m de folga.
      </p>

      {localizacao ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="block font-semibold">Localização aproximada adicionada</span>
              <span className="text-muted-foreground tabular-nums">
                {formato4.format(localizacao.lat)}, {formato4.format(localizacao.lon)}
              </span>
            </span>
          </p>
          <Button type="button" variant="outline" onClick={remover} disabled={desabilitado} className="max-sm:w-full">
            <X aria-hidden="true" />
            Remover localização
          </Button>
        </div>
      ) : (
        suportada && (
          <Button
            type="button"
            variant="outline"
            onClick={pedir}
            disabled={desabilitado || estado === "pedindo"}
            className="w-fit max-sm:w-full"
          >
            {estado === "pedindo" ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <LocateFixed aria-hidden="true" />
            )}
            Usar minha localização
          </Button>
        )
      )}

      <p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
        {localizacao ? "" : status}
      </p>
    </div>
  )
}
