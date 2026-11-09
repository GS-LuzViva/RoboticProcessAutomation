import { useMemo, type ReactNode } from "react"
import { Link } from "react-router"
import { CircleHelp, Lightbulb, LightbulbOff, MapPin, SunDim, type LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { tituloDaRota } from "@/components/layout/navegacao"
import { EsqueletoPainel } from "@/components/luzviva/Esqueletos"
import { EstadoErro, EstadoVazio } from "@/components/luzviva/Estados"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useChamados, usePainel } from "@/hooks/use-api"
import { STATUS_EM_ABERTO } from "@/lib/dominio"
import { formatarDataHora, formatarHoras, formatarNumero, formatarPercentual, nomeArea } from "@/lib/formatar"
import type { Area } from "@/lib/tipos"
import { cn } from "@/lib/utils"

import { SEGMENTOS, formatarPercentual1, montarLinhas, valorSegmento, type ChaveSegmento, type LinhaPainel } from "./painel/comparacao"

/**
 * Chamados em aberto (aberto ou em atendimento) contados agora na API de chamados, por área: o
 * mesmo número da tela Chamados. A view do painel guarda o número da geração dos dados, que fica
 * velho a cada chamado aberto ou concluído; ela só vale se a consulta ao vivo falhar.
 */
type ChamadosAbertos =
  | { estado: "vivo"; porArea: ReadonlyMap<Area, number> }
  | { estado: "carregando" }
  | { estado: "da_geracao" }

function useChamadosAbertos(): ChamadosAbertos {
  const consulta = useChamados(STATUS_EM_ABERTO)
  return useMemo(() => {
    if (consulta.data) {
      const porArea = new Map<Area, number>()
      for (const chamado of consulta.data.dados) {
        porArea.set(chamado.area_piloto, (porArea.get(chamado.area_piloto) ?? 0) + 1)
      }
      return { estado: "vivo", porArea }
    }
    return consulta.isError ? { estado: "da_geracao" } : { estado: "carregando" }
  }, [consulta.data, consulta.isError])
}

/** Número de chamados em aberto da área: ao vivo, ou o da view se a consulta falhou. null = carregando. */
function chamadosDaArea(linha: LinhaPainel, abertos: ChamadosAbertos): number | null {
  if (abertos.estado === "vivo") return abertos.porArea.get(linha.subprefeitura) ?? 0
  if (abertos.estado === "da_geracao") return linha.chamados_em_aberto
  return null
}

/** Valor da célula ou do indicador: esqueleto enquanto carrega, aviso quando é o número antigo. */
function ValorChamados({ linha, abertos }: { linha: LinhaPainel; abertos: ChamadosAbertos }) {
  const n = chamadosDaArea(linha, abertos)
  if (n === null) {
    return (
      <>
        <Skeleton aria-hidden="true" className="ml-auto inline-block h-4 w-6 align-middle" />
        <span className="sr-only">carregando</span>
      </>
    )
  }
  return (
    <>
      {formatarNumero(n, 0)}
      {abertos.estado === "da_geracao" && (
        <span className="block text-xs font-normal text-muted-foreground">na geração dos dados</span>
      )}
    </>
  )
}

const ICONES: Record<ChaveSegmento, LucideIcon> = { apagadas: LightbulbOff, insuficientes: SunDim, ok: Lightbulb }
const TEXTO_ICONE: Record<ChaveSegmento, string> = {
  apagadas: "text-apagada",
  insuficientes: "text-insuficiente",
  ok: "text-ok",
}

/** Legenda única da barra empilhada, no topo da comparação. */
function LegendaBarra() {
  return (
    <ul aria-label="Legenda da barra" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      {SEGMENTOS.map((s) => {
        const Icone = ICONES[s.chave]
        return (
          <li key={s.chave} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("size-3 rounded-[3px]", s.classe)} />
            <Icone aria-hidden="true" className={cn("size-4", TEXTO_ICONE[s.chave])} />
            {s.nome}
          </li>
        )
      })}
    </ul>
  )
}

/** Barra empilhada das inspecionadas (apagada, insuficiente, ok) com o equivalente em texto. */
function BarraSituacao({ linha }: { linha: LinhaPainel }) {
  const total = linha.luminarias_inspecionadas
  const nome = nomeArea(linha.subprefeitura)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div aria-hidden="true" className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-[3px] bg-muted">
        {total > 0 &&
          SEGMENTOS.map((s) => {
            const n = valorSegmento(linha, s.chave)
            if (n === 0) return null
            return <span key={s.chave} className={cn("h-full", s.classe)} style={{ width: `${(n / total) * 100}%` }} />
          })}
      </div>
      <ul className="sr-only" aria-label={`Situação das inspecionadas em ${nome}`}>
        {SEGMENTOS.map((s) => {
          const n = valorSegmento(linha, s.chave)
          return (
            <li key={s.chave}>
              {s.nome}: {formatarNumero(n, 0)} ({formatarPercentual(total > 0 ? (n / total) * 100 : null)})
            </li>
          )
        })}
      </ul>
      <p aria-hidden="true" className="text-sm text-muted-foreground">
        <span className="font-semibold text-apagada tabular-nums">{formatarNumero(linha.apagadas, 0)}</span>{" "}
        {linha.apagadas === 1 ? "apagada" : "apagadas"} e{" "}
        <span className="font-semibold text-insuficiente tabular-nums">{formatarNumero(linha.insuficientes, 0)}</span>{" "}
        {linha.insuficientes === 1 ? "insuficiente" : "insuficientes"}
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{formatarNumero(total, 0)}</span> de{" "}
        <span className="tabular-nums">{formatarNumero(linha.luminarias_cadastradas, 0)}</span> luminárias inspecionadas
        {linha.pct_inspecionadas !== null && (
          <span className="tabular-nums"> ({formatarPercentual(linha.pct_inspecionadas)})</span>
        )}
      </p>
    </div>
  )
}

function Indicador({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2 last:border-b-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-right text-base font-semibold whitespace-nowrap tabular-nums">{children}</dd>
    </div>
  )
}

function LinhaArea({ linha, abertos }: { linha: LinhaPainel; abertos: ChamadosAbertos }) {
  const nome = nomeArea(linha.subprefeitura)
  return (
    <li className="grid gap-4 border-b p-4 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)] md:p-6 lg:grid-cols-[8rem_7.5rem_minmax(0,1fr)_15rem] lg:items-start lg:gap-6">
      <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-start">
        <h3 className="text-lg font-bold">{nome}</h3>
        {/* Mesmo botão "Ver no mapa" da fila (contorno; 44 px no celular pelo tamanho padrão). */}
        <Button asChild variant="outline">
          <Link to={`/?area=${encodeURIComponent(linha.subprefeitura)}`}>
            <MapPin aria-hidden="true" />
            Ver no mapa<span className="sr-only">: {nome}</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-col">
        <span className="font-placa text-2xl leading-none font-bold">
          {formatarPercentual1(linha.pct_com_falha)}
        </span>
        <span className="text-sm text-muted-foreground">com falha</span>
      </div>

      <BarraSituacao linha={linha} />

      <dl className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
        <Indicador rotulo="Mediana até o reparo">
          {linha.mediana_horas_ate_reparo === null ? (
            <span className="font-normal text-muted-foreground">sem reparos concluídos</span>
          ) : (
            formatarHoras(linha.mediana_horas_ate_reparo)
          )}
        </Indicador>
        <Indicador rotulo="Chamados em aberto">
          <ValorChamados linha={linha} abertos={abertos} />
        </Indicador>
      </dl>
    </li>
  )
}

const NUM = "text-right tabular-nums"

function TabelaPainel({
  linhas,
  geradoEm,
  abertos,
}: {
  linhas: readonly LinhaPainel[]
  geradoEm: string
  abertos: ChamadosAbertos
}) {
  return (
    <section aria-labelledby="painel-tabela-titulo" className="flex flex-col gap-3">
      <h2 id="painel-tabela-titulo" className="text-base font-bold">
        Todos os números
      </h2>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="min-w-[56rem]" rotulo="Todos os números do painel por área">
          <TableCaption className="sr-only">
            Números do painel por área, gerados em {formatarDataHora(geradoEm)}.
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="sticky left-0 z-10 bg-card px-4">
                Área
              </TableHead>
              <TableHead scope="col" className={NUM}>
                Cadastradas
              </TableHead>
              <TableHead scope="col" className={NUM}>
                Inspecionadas
              </TableHead>
              <TableHead scope="col" className={NUM}>
                Ok
              </TableHead>
              <TableHead scope="col" className={NUM}>
                Insuficientes
              </TableHead>
              <TableHead scope="col" className={NUM}>
                Apagadas
              </TableHead>
              <TableHead scope="col" className={NUM}>
                Com falha
              </TableHead>
              <TableHead scope="col" className={NUM}>
                Mediana até o reparo
              </TableHead>
              <TableHead scope="col" className={cn(NUM, "pr-4")}>
                Chamados em aberto
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.subprefeitura}>
                <TableHead scope="row" className="sticky left-0 z-10 bg-card px-4 font-semibold">
                  {nomeArea(l.subprefeitura)}
                </TableHead>
                <TableCell className={NUM}>{formatarNumero(l.luminarias_cadastradas, 0)}</TableCell>
                <TableCell className={NUM}>{formatarNumero(l.luminarias_inspecionadas, 0)}</TableCell>
                <TableCell className={NUM}>{formatarNumero(l.ok, 0)}</TableCell>
                <TableCell className={NUM}>{formatarNumero(l.insuficientes, 0)}</TableCell>
                <TableCell className={NUM}>{formatarNumero(l.apagadas, 0)}</TableCell>
                <TableCell className={NUM}>{formatarPercentual1(l.pct_com_falha)}</TableCell>
                <TableCell className={NUM}>
                  {l.mediana_horas_ate_reparo === null ? "sem reparos" : formatarHoras(l.mediana_horas_ate_reparo)}
                </TableCell>
                <TableCell className={cn(NUM, "pr-4")}>
                  <ValorChamados linha={l} abertos={abertos} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
          Gerados em {formatarDataHora(geradoEm)}. O percentual com falha e a divisão por situação contam só as
          luminárias inspecionadas.{" "}
          {abertos.estado === "da_geracao"
            ? "Não foi possível consultar os chamados agora: os chamados em aberto são os da geração dos dados."
            : "Os chamados em aberto (abertos ou em atendimento) são contados agora, como na tela Chamados."}
        </p>
      </div>
    </section>
  )
}

export default function Painel() {
  const consulta = usePainel()
  const abertos = useChamadosAbertos()
  const titulo = tituloDaRota("/painel")

  const descricao = (
    <>
      <p>Compare as três áreas-piloto: quanto das luminárias inspecionadas falha, quanto já foi inspecionado e quanto o reparo demora.</p>
      {consulta.data ? (
        <p>Dados gerados em {formatarDataHora(consulta.data.gerado_em)}.</p>
      ) : consulta.isPending ? (
        <Skeleton aria-hidden="true" className="mt-1 h-4 w-48" />
      ) : null}
    </>
  )

  if (consulta.isError) {
    return (
      <>
        <PageHeader titulo={titulo} descricao={descricao} />
        <EstadoErro
          titulo="Não foi possível carregar o painel"
          erro={consulta.error}
          aoTentarDeNovo={consulta.refetch}
          tentando={consulta.isRefetching}
        />
      </>
    )
  }

  if (consulta.isPending) {
    return (
      <>
        <PageHeader titulo={titulo} descricao={descricao} />
        <EsqueletoPainel rotulo="Carregando o painel…" />
      </>
    )
  }

  const linhas = montarLinhas(consulta.data.dados)

  if (linhas.length === 0) {
    return (
      <>
        <PageHeader titulo={titulo} descricao={descricao} />
        <EstadoVazio
          titulo="O painel ainda não tem dados"
          descricao="O processamento diário dos dados ainda não publicou os indicadores das áreas. Volte a esta tela depois que ele rodar."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader titulo={titulo} descricao={descricao} />

      <section aria-labelledby="painel-comparacao-titulo" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h2 id="painel-comparacao-titulo" className="text-base font-bold">
            Comparação das áreas
          </h2>
          <div className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-6">
            <LegendaBarra />
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CircleHelp aria-hidden="true" className="size-4 shrink-0" />
              A barra mostra só as luminárias inspecionadas; sem medição fica de fora.
            </p>
          </div>
        </div>
        <ul className="flex flex-col rounded-xl border bg-card">
          {linhas.map((linha) => (
            <LinhaArea key={linha.subprefeitura} linha={linha} abertos={abertos} />
          ))}
        </ul>
      </section>

      <TabelaPainel linhas={linhas} geradoEm={consulta.data.gerado_em} abertos={abertos} />
    </>
  )
}
