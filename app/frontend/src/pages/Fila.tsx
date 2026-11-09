import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import type { SortingState, Updater } from "@tanstack/react-table"
import { Search, SearchX } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { tituloDaRota } from "@/components/layout/navegacao"
import { AreaToggle } from "@/components/luzviva/AreaToggle"
import { EsqueletoTabela } from "@/components/luzviva/Esqueletos"
import { EstadoErro, EstadoVazio } from "@/components/luzviva/Estados"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFila } from "@/hooks/use-api"
import { useAreaParam } from "@/hooks/use-area-param"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatarDataHora, formatarNumero, nomeArea } from "@/lib/formatar"
import type { ItemFila } from "@/lib/tipos"

import { DetalheLuminaria } from "./fila/DetalheLuminaria"
import { ListaFila } from "./fila/ListaFila"
import { TabelaFila } from "./fila/TabelaFila"
import { ORDEM_PADRAO, escreverOrdem, filtrarFila, lerOrdem, posicoesNoPoste } from "./fila/regras"

const SEM_ITENS: readonly ItemFila[] = []
const PARAMETRO_BUSCA = "busca"
const PARAMETRO_ORDEM = "ordem"
const ESPERA_BUSCA_MS = 200

/** Opções de ordem da lista do celular (na tabela, a ordem vem dos cabeçalhos). */
const OPCOES_ORDEM = [
  { valor: "prioridade:desc", rotulo: "Maior prioridade primeiro" },
  { valor: "prioridade:asc", rotulo: "Menor prioridade primeiro" },
  { valor: "lux:asc", rotulo: "Menos lux primeiro" },
  { valor: "lux:desc", rotulo: "Mais lux primeiro" },
  { valor: "ocorrencias_app:desc", rotulo: "Mais relatos primeiro" },
  { valor: "ocorrencias_app:asc", rotulo: "Menos relatos primeiro" },
] as const

function textoContagem(visiveis: number, total: number): string {
  const nome = total === 1 ? "luminária" : "luminárias"
  if (visiveis === total) return `${formatarNumero(total, 0)} ${nome} na fila`
  return `${formatarNumero(visiveis, 0)} de ${formatarNumero(total, 0)} ${nome} na fila`
}

/** Busca com espera (debounce) e guardada na URL (`?busca=`), sem empilhar histórico. */
function useBusca() {
  const [parametros, setParametros] = useSearchParams()
  const naUrl = parametros.get(PARAMETRO_BUSCA) ?? ""
  const [texto, setTexto] = useState(naUrl)
  const [busca, setBusca] = useState(naUrl)

  useEffect(() => {
    if (texto === busca) return
    const espera = window.setTimeout(() => setBusca(texto), ESPERA_BUSCA_MS)
    return () => window.clearTimeout(espera)
  }, [texto, busca])

  useEffect(() => {
    setParametros(
      (atuais) => {
        if ((atuais.get(PARAMETRO_BUSCA) ?? "") === busca) return atuais
        const proximos = new URLSearchParams(atuais)
        if (busca) proximos.set(PARAMETRO_BUSCA, busca)
        else proximos.delete(PARAMETRO_BUSCA)
        return proximos
      },
      { replace: true },
    )
  }, [busca, setParametros])

  const limpar = useCallback(() => {
    setTexto("")
    setBusca("")
  }, [])

  return { texto, setTexto, busca, limpar }
}

/** Ordem guardada na URL (`?ordem=lux:asc`), sem empilhar histórico. A ordem padrão não aparece na URL. */
function useOrdem() {
  const [parametros, setParametros] = useSearchParams()
  const naUrl = parametros.get(PARAMETRO_ORDEM)
  const ordem = useMemo(() => lerOrdem(naUrl), [naUrl])

  const setOrdem = useCallback(
    (atualizacao: Updater<SortingState>) => {
      setParametros(
        (atuais) => {
          const anterior = lerOrdem(atuais.get(PARAMETRO_ORDEM))
          const valor = escreverOrdem(typeof atualizacao === "function" ? atualizacao(anterior) : atualizacao)
          const proximos = new URLSearchParams(atuais)
          if (valor === escreverOrdem(ORDEM_PADRAO)) proximos.delete(PARAMETRO_ORDEM)
          else proximos.set(PARAMETRO_ORDEM, valor)
          return proximos
        },
        { replace: true },
      )
    },
    [setParametros],
  )

  return [ordem, setOrdem] as const
}

export default function Fila() {
  const [area] = useAreaParam({ permitirTodas: true })
  const consulta = useFila(area)
  const ehCelular = useIsMobile()
  const { texto, setTexto, busca, limpar } = useBusca()
  const [ordem, ordenar] = useOrdem()
  const [selecionado, setSelecionado] = useState<ItemFila | null>(null)
  const [detalheAberto, setDetalheAberto] = useState(false)
  const idBusca = useId()
  const idOrdem = useId()

  const todos = consulta.data?.dados ?? SEM_ITENS
  const visiveis = useMemo(() => filtrarFila(todos, busca), [todos, busca])
  // Numerada sobre a fila inteira: "1 de 3 no poste" não muda com a busca.
  const posicoes = useMemo(() => posicoesNoPoste(todos), [todos])
  const legenda = area ? `Fila de manutenção, área ${nomeArea(area)}` : "Fila de manutenção, todas as áreas"

  const abrir = useCallback((item: ItemFila) => {
    setSelecionado(item)
    setDetalheAberto(true)
  }, [])

  const geradoEm = consulta.data?.gerado_em
  const descricao = (
    <p>
      Luminárias com falha ou relato, da maior para a menor prioridade. Lista gerada pelo processamento diário dos
      dados{geradoEm ? ` em ${formatarDataHora(geradoEm)}` : ""}.
    </p>
  )

  let conteudo
  if (consulta.isPending) {
    conteudo = <EsqueletoTabela colunas={8} linhas={10} rotulo="Carregando a fila…" />
  } else if (consulta.isError) {
    conteudo = (
      <EstadoErro
        titulo="Não foi possível carregar a fila"
        erro={consulta.error}
        aoTentarDeNovo={consulta.refetch}
        tentando={consulta.isRefetching}
      />
    )
  } else if (todos.length === 0) {
    conteudo = (
      <EstadoVazio
        titulo={area ? `Nenhuma luminária na fila em ${nomeArea(area)}` : "Nenhuma luminária na fila"}
        descricao="Quando o robô medir pouca luz ou um cidadão relatar um problema, a luminária entra aqui."
      />
    )
  } else if (visiveis.length === 0) {
    conteudo = (
      <EstadoVazio
        icone={SearchX}
        titulo="Nenhuma luminária com esse filtro"
        descricao={`Nada na fila tem placa ou endereço com “${busca}”. Confira a placa ou limpe a busca para ver a fila inteira.`}
        acao={
          <Button
            variant="outline"
            onClick={() => {
              limpar()
              document.getElementById(idBusca)?.focus() // o botão some: o foco volta para a busca
            }}
          >
            Limpar busca
          </Button>
        }
      />
    )
  } else if (ehCelular) {
    conteudo = <ListaFila itens={visiveis} posicoes={posicoes} ordem={ordem} aoAbrir={abrir} legenda={legenda} />
  } else {
    conteudo = (
      <TabelaFila
        itens={visiveis}
        posicoes={posicoes}
        ordem={ordem}
        aoOrdenar={ordenar}
        aoAbrir={abrir}
        legenda={legenda}
      />
    )
  }

  const ordemAtual = escreverOrdem(ordem)

  return (
    <>
      <PageHeader titulo={tituloDaRota("/fila")} descricao={descricao} acoes={<AreaToggle permitirTodas />} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex w-full flex-col gap-1.5 sm:w-80">
            <Label htmlFor={idBusca}>Buscar placa ou endereço</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={idBusca}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Ex.: IP0723371 ou Rua Augusta…"
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                className="bg-card pl-8"
              />
            </div>
          </div>
          {ehCelular && (
            <div className="flex w-full flex-col gap-1.5">
              <Label htmlFor={idOrdem}>Ordenar</Label>
              <Select
                value={ordemAtual}
                onValueChange={(valor) => ordenar(lerOrdem(valor))}
              >
                <SelectTrigger id={idOrdem} className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCOES_ORDEM.map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <p role="status" className="text-sm text-muted-foreground tabular-nums">
          {consulta.isSuccess ? textoContagem(visiveis.length, todos.length) : ""}
        </p>
      </div>

      {conteudo}

      <DetalheLuminaria
        item={selecionado}
        aberto={detalheAberto}
        aoMudarAberto={setDetalheAberto}
        geradoEm={geradoEm}
      />
    </>
  )
}
