import { Link } from "react-router"
import { MessageSquareText, TriangleAlert } from "lucide-react"

import { LuxMeter } from "@/components/luzviva/LuxMeter"
import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { SituacaoBadge } from "@/components/luzviva/SituacaoBadge"
import { Button } from "@/components/ui/button"
import { formatarDataHora, formatarEndereco, plural, VAZIO } from "@/lib/formatar"
import type { Area } from "@/lib/tipos"

import type { Poste } from "./postes"

/** Marca o título do popup, que recebe o foco quando o poste é aberto pela lista no celular. */
export const ATRIBUTO_FOCO_POPUP = "data-foco-popup"

/** Conteúdo do popup de um poste (React, sem HTML em texto). */
export function PopupPoste({ poste, area }: { poste: Poste; area: Area }) {
  const parametrosRelato = new URLSearchParams({ area })
  if (poste.placa) parametrosRelato.set("placa", poste.placa)
  const parametrosAssistente = new URLSearchParams()
  if (poste.placa) parametrosAssistente.set("placa", poste.placa)
  const atributoFoco = { [ATRIBUTO_FOCO_POPUP]: "" }

  return (
    <div className="flex w-64 max-w-full flex-col gap-3 text-popover-foreground max-[359px]:w-56">
      {/* pr-8: espaço do X (44 px no toque). */}
      <h2
        tabIndex={-1}
        {...atributoFoco}
        className="flex flex-col gap-1.5 rounded-md pr-8 outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <PlacaChip placa={poste.placa} size="md" />
        <span className="text-sm leading-snug font-semibold break-words">
          {formatarEndereco(poste.endereco) ?? "Endereço não informado"}
        </span>
      </h2>

      {/* Abaixo de 360 px os rótulos ficam em 13 px numa linha só: o popup cabe no mapa de 320 × 568. */}
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-sm max-[359px]:[&_dt]:text-xs max-[359px]:[&_dt]:whitespace-nowrap">
        <dt className="text-muted-foreground">Situação</dt>
        <dd>
          <SituacaoBadge situacao={poste.situacao} size="sm" />
        </dd>
        <dt className="text-muted-foreground">Iluminação</dt>
        <dd>
          <LuxMeter lux={poste.ultimo_lux} />
        </dd>
        <dt className="text-muted-foreground">Última medição</dt>
        <dd className="tabular-nums">{poste.ultima_medicao ? formatarDataHora(poste.ultima_medicao) : VAZIO}</dd>
        <dt className="text-muted-foreground">Relatos do app</dt>
        <dd className="tabular-nums">{plural(poste.ocorrencias_app, "relato", "relatos", "Nenhum relato")}</dd>
        {poste.luminarias > 1 && (
          <>
            <dt className="text-muted-foreground">Neste poste</dt>
            <dd className="tabular-nums">{plural(poste.luminarias, "luminária", "luminárias")}</dd>
          </>
        )}
      </dl>

      <div className="flex flex-col gap-2">
        <Button asChild size="sm" className="w-full">
          <Link to={`/relatar?${parametrosRelato.toString()}`}>
            <TriangleAlert aria-hidden="true" />
            Relatar problema neste poste
          </Link>
        </Button>
        {poste.placa && (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link to={`/assistente?${parametrosAssistente.toString()}`}>
              <MessageSquareText aria-hidden="true" />
              Perguntar ao assistente
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
