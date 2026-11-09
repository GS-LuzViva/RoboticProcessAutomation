import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { List } from "lucide-react"
import type { Map as MapaLeaflet } from "leaflet"

import { PageHeader } from "@/components/layout/PageHeader"
import { tituloDaRota } from "@/components/layout/navegacao"
import { AreaToggle } from "@/components/luzviva/AreaToggle"
import { EsqueletoBloco } from "@/components/luzviva/Esqueletos"
import { EstadoErro } from "@/components/luzviva/Estados"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useLuminarias } from "@/hooks/use-api"
import { useAreaParam } from "@/hooks/use-area-param"
import { SITUACOES } from "@/lib/dominio"
import { formatarDataHora, formatarEndereco, formatarNumero, nomeArea } from "@/lib/formatar"
import type { Situacao } from "@/lib/tipos"
import { cn } from "@/lib/utils"

import { ORDEM_LEGENDA, PLURAL_SITUACAO, useMovimentoReduzido, useTelaLarga } from "./mapa/estilo"
import { LegendaMapa } from "./mapa/LegendaMapa"
import { ListaFalhas } from "./mapa/ListaFalhas"
import { MapaLuminarias, type PedidoFoco } from "./mapa/MapaLuminarias"
import { agruparPostes, contagemVazia, ordenarParaDesenho, postesComFalha, type Contagem, type Poste } from "./mapa/postes"

/** "Placa IP0723371 aberta no mapa: Rua da Gloria." (anúncio para leitor de tela). */
function textoAberto(poste: Poste): string {
  const placa = poste.placa ? `Placa ${poste.placa}` : "Poste sem placa"
  const endereco = formatarEndereco(poste.endereco)
  return `${placa} aberta no mapa${endereco ? `: ${endereco}` : ""}.`
}

function frase(n: number, situacao: Situacao): string {
  const [um, varios] = PLURAL_SITUACAO[situacao]
  return `${formatarNumero(n, 0)} ${n === 1 ? um : varios}`
}

/** "Mapa de Sé: 600 luminárias, 11 apagadas, 19 insuficientes, 570 ok e 0 sem medição." */
function rotuloDoMapa(nome: string, total: number, contagem: Contagem): string {
  const partes = ORDEM_LEGENDA.map((s) => frase(contagem[s], s))
  const ultima = partes.pop()
  return `Mapa das luminárias de ${nome}: ${formatarNumero(total, 0)} luminárias, ${partes.join(", ")} e ${ultima}.`
}

/** Texto curto acima da lista: "30 luminárias apagadas ou insuficientes em 12 postes." */
function resumoFalhas(postes: readonly Poste[]): string {
  if (postes.length === 0) return "Nenhuma falha nesta área."
  const luminarias = postes.reduce((soma, p) => soma + p.luminarias, 0)
  const textoLum = `${formatarNumero(luminarias, 0)} ${luminarias === 1 ? "luminária apagada ou insuficiente" : "luminárias apagadas ou insuficientes"}`
  const textoPostes =
    luminarias === postes.length ? "" : ` em ${formatarNumero(postes.length, 0)} ${postes.length === 1 ? "poste" : "postes"}`
  return `${textoLum}${textoPostes}. Apagadas primeiro, depois a menor iluminação.`
}

export default function Mapa() {
  const [area] = useAreaParam()
  const [parametros, setParametros] = useSearchParams()
  const placaPedida = parametros.get("placa")?.trim().toUpperCase() || null
  const consulta = useLuminarias(area)
  const movimentoReduzido = useMovimentoReduzido()
  const telaLarga = useTelaLarga()
  const nome = nomeArea(area)

  const mapaRef = useRef<MapaLeaflet>(null)
  const regiaoMapaRef = useRef<HTMLDivElement>(null)
  // Link vindo de outra tela ("Ver no mapa"): `#/?area=SE&placa=IP0723371` abre aquele poste.
  // O pedido fica guardado aqui porque a placa sai da URL assim que os dados chegam.
  const [pedido, setPedido] = useState(() => (placaPedida ? { area, placa: placaPedida } : null))
  // undefined = ninguém escolheu nada ainda (vale o pedido do link). A seleção vale só para a
  // área em que foi feita: trocar de área fecha o popup.
  const [selecao, setSelecao] = useState<{ area: string; id: string } | null | undefined>(undefined)
  if (placaPedida && (pedido?.placa !== placaPedida || pedido.area !== area)) {
    setPedido({ area, placa: placaPedida })
    setSelecao(undefined)
  }
  const [ocultas, setOcultas] = useState<ReadonlySet<Situacao>>(() => new Set())
  const [listaAberta, setListaAberta] = useState(false)

  const { postes, contagem, total } = useMemo(
    () => (consulta.data ? agruparPostes(consulta.data.dados) : { postes: [], contagem: contagemVazia(), total: 0 }),
    [consulta.data],
  )
  const paraDesenho = useMemo(() => ordenarParaDesenho(postes), [postes])
  const falhas = useMemo(() => postesComFalha(postes), [postes])
  const visiveis = useMemo(() => new Set(SITUACOES.filter((s) => !ocultas.has(s))), [ocultas])
  const alvoPedido = useMemo(() => {
    if (!pedido || pedido.area !== area) return null
    // A mesma placa pode ter luminárias em situações diferentes: abre a pior.
    return [...falhas, ...postes].find((p) => p.placa === pedido.placa) ?? null
  }, [pedido, area, falhas, postes])
  const selecionadoId =
    selecao === undefined ? (alvoPedido?.id ?? null) : selecao?.area === area ? selecao.id : null
  const selecionado = useMemo(() => postes.find((p) => p.id === selecionadoId) ?? null, [postes, selecionadoId])

  const alternarSituacao = useCallback((situacao: Situacao) => {
    setOcultas((atuais) => {
      const proximas = new Set(atuais)
      if (proximas.has(situacao)) proximas.delete(situacao)
      else proximas.add(situacao)
      return proximas
    })
  }, [])

  const fechar = useCallback((id: string | null) => {
    setSelecao((atual) => (atual === undefined || id === null || atual?.id === id ? null : atual))
  }, [])

  const [pedidoFoco, setPedidoFoco] = useState<PedidoFoco | null>(null)
  // Anúncio educado para leitor de tela quando a lista ao lado abre um poste (o foco fica na lista).
  const [anuncio, setAnuncio] = useState("")
  // Celular: poste escolhido na folha da lista, aberto só depois que a folha termina de fechar.
  const posteDaFolha = useRef<Poste | null>(null)

  /**
   * Mostra a situação do poste (se estava escondida), abre o popup e pede ao mapa para centralizar
   * nele com o popup inteiro à vista. `moverFoco` leva o foco para o popup.
   */
  const focar = useCallback(
    (poste: Poste, moverFoco = false) => {
      setOcultas((atuais) => {
        if (!atuais.has(poste.situacao)) return atuais
        const proximas = new Set(atuais)
        proximas.delete(poste.situacao)
        return proximas
      })
      setSelecao({ area, id: poste.id })
      setPedidoFoco((anterior) => ({ poste, moverFoco, seq: (anterior?.seq ?? 0) + 1 }))
    },
    [area],
  )

  const escolherDaLista = useCallback(
    (poste: Poste) => {
      if (telaLarga) {
        focar(poste)
        const texto = textoAberto(poste)
        // Mesmo poste de novo: muda o texto para o leitor de tela anunciar outra vez.
        setAnuncio((atual) => (atual === texto ? `${texto} ` : texto))
        return
      }
      posteDaFolha.current = poste
      setListaAberta(false)
    },
    [focar, telaLarga],
  )

  /** A folha da lista fechou (animação terminada): abre o poste escolhido e leva o foco ao popup. */
  const aoFecharFolha = useCallback(
    (evento: Event) => {
      const poste = posteDaFolha.current
      if (!poste) return // fechou sem escolher: o foco volta ao botão "Ver lista de falhas"
      posteDaFolha.current = null
      evento.preventDefault()
      regiaoMapaRef.current?.scrollIntoView({ block: "nearest", behavior: movimentoReduzido ? "auto" : "smooth" })
      focar(poste, true)
    },
    [focar, movimentoReduzido],
  )

  // Com os dados da área carregados, a placa sai da URL (o pedido já foi guardado).
  const dadosProntos = Boolean(consulta.data)
  useEffect(() => {
    if (!placaPedida || !dadosProntos) return
    setParametros(
      (atuais) => {
        const proximos = new URLSearchParams(atuais)
        proximos.delete("placa")
        return proximos
      },
      { replace: true },
    )
  }, [placaPedida, dadosProntos, setParametros])

  const descricao = (
    <>
      Onde a iluminação falha na área escolhida e o que consertar primeiro.
      {consulta.data && <> Dados gerados em {formatarDataHora(consulta.data.gerado_em)}.</>}
    </>
  )

  const cabecalho = <PageHeader titulo={tituloDaRota("/")} descricao={descricao} acoes={<AreaToggle />} />

  if (consulta.isError) {
    return (
      <>
        {cabecalho}
        <EstadoErro
          titulo={`Não foi possível carregar o mapa de ${nome}`}
          erro={consulta.error}
          aoTentarDeNovo={consulta.refetch}
          tentando={consulta.isRefetching}
        />
      </>
    )
  }

  const carregando = consulta.isPending
  const tituloLista = `Falhas em ${nome}`

  const lista = (
    <ListaFalhas postes={falhas} nomeDaArea={nome} selecionado={selecionadoId} aoEscolher={escolherDaLista} />
  )

  return (
    <>
      {cabecalho}

      {!telaLarga && (
        <Sheet open={listaAberta && !telaLarga} onOpenChange={setListaAberta}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full sm:w-fit" disabled={carregando}>
              <List aria-hidden="true" />
              {carregando ? "Carregando a lista de falhas…" : `Ver lista de falhas (${formatarNumero(falhas.length, 0)})`}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85svh] gap-0 rounded-t-xl" onCloseAutoFocus={aoFecharFolha}>
            <SheetHeader className="border-b pr-14">
              <SheetTitle>{tituloLista}</SheetTitle>
              <SheetDescription>{resumoFalhas(falhas)}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">{lista}</div>
          </SheetContent>
        </Sheet>
      )}

      <section
        aria-label={`Mapa e lista de falhas de ${nome}`}
        className="flex min-h-[60svh] flex-1 basis-0 flex-col gap-4 lg:min-h-[32rem] lg:flex-row"
      >
        <div ref={regiaoMapaRef} className="relative min-h-[60svh] flex-1 rounded-xl border bg-muted lg:min-h-0">
          {carregando ? (
            <EsqueletoBloco rotulo={`Carregando o mapa de ${nome}…`} className="absolute inset-0" />
          ) : (
            <>
              <MapaLuminarias
                area={area}
                postes={paraDesenho}
                visiveis={visiveis}
                selecionado={selecionado}
                focoInicial={selecao === undefined ? alvoPedido : null}
                pedidoFoco={pedidoFoco}
                aoSelecionar={focar}
                aoFechar={fechar}
                rotulo={rotuloDoMapa(nome, total, contagem)}
                movimentoReduzido={movimentoReduzido}
                mapaRef={mapaRef}
              />
              <LegendaMapa
                contagem={contagem}
                visiveis={visiveis}
                aoAlternar={alternarSituacao}
                className={cn(
                  "absolute right-2 bottom-7 left-2 z-10 sm:right-auto sm:bottom-3 sm:left-3 sm:max-w-[calc(100%-1.5rem)]",
                  // No celular o popup precisa do mapa inteiro: a legenda volta quando ele fecha.
                  selecionado && "max-sm:hidden",
                )}
              />
            </>
          )}
        </div>

        {telaLarga && (
          // section, não aside: dentro do <main>, um complementary seria um landmark fora do topo.
          <section
            aria-labelledby="lista-falhas-titulo"
            className="flex min-h-0 w-[22.5rem] shrink-0 flex-col overflow-hidden rounded-xl border bg-card"
          >
            <div className="flex flex-col gap-0.5 border-b px-4 py-3">
              <h2 id="lista-falhas-titulo" className="text-base font-bold">
                {tituloLista}
              </h2>
              {carregando ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <p className="text-sm text-muted-foreground">{resumoFalhas(falhas)}</p>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {carregando ? (
                <div role="status" aria-live="polite" className="flex flex-col">
                  <span className="sr-only">Carregando a lista de falhas…</span>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} aria-hidden="true" className="flex flex-col gap-2 border-b px-4 py-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                lista
              )}
            </div>
          </section>
        )}
      </section>

      <p role="status" className="sr-only">
        {anuncio}
      </p>
    </>
  )
}
