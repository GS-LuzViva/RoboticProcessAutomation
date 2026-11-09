import { useEffect, useRef, type ReactNode } from "react"
import { Link } from "react-router"
import { CircleCheck, Map as IconeMapa, Plus } from "lucide-react"

import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { Button } from "@/components/ui/button"
import { formatarConfianca, formatarDataHora, nomeArea } from "@/lib/formatar"
import type { Ocorrencia } from "@/lib/tipos"

import { nomeProblema } from "./relato"

interface RelatoEnviadoProps {
  ocorrencia: Ocorrencia
  aoRelatarOutro: () => void
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t py-3 first:border-t-0 first:pt-0 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

/** Confirmação que substitui o formulário: o que foi registrado e o que a visão achou da foto. */
export function RelatoEnviado({ ocorrencia, aoRelatarOutro }: RelatoEnviadoProps) {
  const refTitulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    refTitulo.current?.focus()
  }, [])

  const temVisao = typeof ocorrencia.confianca_visao === "number"
  const mapa = `/?${new URLSearchParams({
    area: ocorrencia.area_piloto,
    ...(ocorrencia.placa ? { placa: ocorrencia.placa } : {}),
  }).toString()}`

  return (
    <section aria-labelledby="relato-enviado-titulo" className="flex max-w-xl flex-col gap-5 rounded-xl border bg-card p-4 md:p-6">
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-ok" />
        <div className="flex flex-col gap-1">
          <h2 id="relato-enviado-titulo" ref={refTitulo} tabIndex={-1} className="text-lg font-bold outline-none">
            Relato enviado
          </h2>
          <p className="text-sm text-muted-foreground">
            A foto e a placa seguem para a equipe de manutenção, que confere a falha.
          </p>
        </div>
      </div>

      <dl className="flex flex-col">
        <Linha rotulo="Poste">
          <PlacaChip placa={ocorrencia.placa} size="md" />
        </Linha>
        <Linha rotulo="Problema">{nomeProblema(ocorrencia.categoria)}</Linha>
        <Linha rotulo="Área">{nomeArea(ocorrencia.area_piloto)}</Linha>
        <Linha rotulo="Verificação da foto">
          {temVisao ? (
            <span>
              Confiança de <span className="font-semibold tabular-nums">{formatarConfianca(ocorrencia.confianca_visao)}</span>
              {ocorrencia.modelo_visao && (
                <span className="text-muted-foreground"> pelo modelo {ocorrencia.modelo_visao}</span>
              )}
            </span>
          ) : (
            <span>Sem confirmação automática: a equipe confere a foto.</span>
          )}
        </Linha>
        <Linha rotulo="Protocolo">
          <span className="font-semibold break-all tabular-nums select-all">{ocorrencia.id_ocorrencia}</span>
        </Linha>
        <Linha rotulo="Recebido em">
          <span className="tabular-nums">{formatarDataHora(ocorrencia.data_hora)}</span>
        </Linha>
      </dl>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={aoRelatarOutro} className="max-sm:w-full">
          <Plus aria-hidden="true" />
          Relatar outro poste
        </Button>
        <Button asChild variant="outline" className="max-sm:w-full">
          <Link to={mapa}>
            <IconeMapa aria-hidden="true" />
            Ver no mapa
          </Link>
        </Button>
      </div>
    </section>
  )
}
