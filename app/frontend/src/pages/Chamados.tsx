import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { CircleCheck, KeyRound } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { AreaToggle } from "@/components/luzviva/AreaToggle"
import { EsqueletoTabela } from "@/components/luzviva/Esqueletos"
import { EstadoErro, EstadoVazio } from "@/components/luzviva/Estados"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAtualizarChamado, useChamados } from "@/hooks/use-api"
import { useAreaParam, VALOR_TODAS } from "@/hooks/use-area-param"
import { useChaveGestor } from "@/hooks/use-chave-gestor"
import { ErroApi, mensagemDeErro } from "@/lib/api"
import { formatarNumero, nomeArea, nomeStatus } from "@/lib/formatar"
import type { Chamado, StatusChamado } from "@/lib/tipos"

import { DialogoCancelar } from "./chamados/DialogoCancelar"
import { DialogoChave, type MotivoChave } from "./chamados/DialogoChave"
import { ListaChamados, TabelaChamados } from "./chamados/VisoesChamados"
import { useTelaLarga } from "./chamados/use-tela-larga"
import { ABA_PADRAO, ABAS, chamadosDaAba, lerAba, prepararChamados, type Aba } from "./chamados/regras"

const TITULO = "Chamados de manutenção"
const PARAMETRO_STATUS = "status"
const SEM_CHAMADOS: readonly Chamado[] = []

interface TrocaPendente {
  chamado: Chamado
  status: StatusChamado
}

function textoResumo(total: number, atrasados: number): string {
  const base = `${formatarNumero(total, 0)} ${total === 1 ? "chamado" : "chamados"}`
  if (!atrasados) return base
  return `${base}, ${formatarNumero(atrasados, 0)} ${atrasados === 1 ? "atrasado" : "atrasados"}`
}

/** Elemento com o foco agora (null se for o <body>). */
function elementoFocado(): HTMLElement | null {
  const ativo = document.activeElement
  return ativo instanceof HTMLElement && ativo !== document.body ? ativo : null
}

function focarAbaAtiva(lista: HTMLElement | null) {
  lista?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')?.focus()
}

/** Botão do cabeçalho: diz se há chave nesta aba (sem mostrá-la) e abre o diálogo para informar ou remover. */
function BotaoChave({ temChave, aoAbrir }: { temChave: boolean; aoAbrir: () => void }) {
  return (
    <Button variant="outline" onClick={aoAbrir} aria-haspopup="dialog" className="bg-card max-sm:w-full">
      <KeyRound aria-hidden="true" />
      Chave do gestor
      {temChave ? (
        <span className="inline-flex items-center gap-1 text-xs text-ok">
          <CircleCheck aria-hidden="true" className="size-3.5" />
          informada
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">não informada</span>
      )}
    </Button>
  )
}

export default function Chamados() {
  const [area] = useAreaParam({ permitirTodas: true })
  const [parametros, setParametros] = useSearchParams()
  const aba = lerAba(parametros.get(PARAMETRO_STATUS))
  const definicaoAba = ABAS.find((item) => item.valor === aba) ?? ABAS[0]

  const consulta = useChamados(undefined, { area })
  const recarregar = consulta.refetch
  const { mutate: atualizar, isPending: atualizando, variables } = useAtualizarChamado()
  const { chave } = useChaveGestor()
  const telaLarga = useTelaLarga()

  const [cancelando, setCancelando] = useState<Chamado | null>(null)
  const [dialogoChave, setDialogoChave] = useState<{ aberto: boolean; motivo: MotivoChave }>({
    aberto: false,
    motivo: "manual",
  })
  /** Troca recusada com 401, esperando a chave. */
  const pendente = useRef<TrocaPendente | null>(null)
  /** Troca a refazer assim que a chave nova chegar ao useMutation. */
  const repetir = useRef<TrocaPendente | null>(null)
  /** Controle que abriu o último pedido ("Atualizar status" da linha ou "Chave do gestor"). */
  const retornoFoco = useRef<HTMLElement | null>(null)
  const refAbas = useRef<HTMLDivElement>(null)

  const dados = consulta.data?.dados ?? SEM_CHAMADOS
  const preparados = useMemo(() => prepararChamados(dados), [dados])
  const contagens = useMemo(
    () => Object.fromEntries(ABAS.map((item) => [item.valor, chamadosDaAba(preparados, item).length])) as Record<Aba, number>,
    [preparados],
  )
  const visiveis = useMemo(() => chamadosDaAba(preparados, definicaoAba), [preparados, definicaoAba])
  const atrasados = useMemo(() => visiveis.filter((item) => item.prazo.atrasado).length, [visiveis])

  const trocarAba = (valor: string) => {
    setParametros(
      (atuais) => {
        const proximos = new URLSearchParams(atuais)
        if (valor === ABA_PADRAO) proximos.delete(PARAMETRO_STATUS)
        else proximos.set(PARAMETRO_STATUS, valor)
        return proximos
      },
      { replace: true },
    )
  }

  const enviar = useCallback(
    (chamado: Chamado, status: StatusChamado) => {
      atualizar(
        { id: chamado.id_chamado, alteracao: { status } },
        {
          onSuccess: (atualizado) => {
            toast.success("Status atualizado", {
              description: `Chamado ${atualizado.id_chamado} agora está ${nomeStatus(atualizado.status).toLocaleLowerCase("pt-BR")}.`,
            })
          },
          onError: (erro) => {
            if (erro instanceof ErroApi && erro.status === 401) {
              pendente.current = { chamado, status }
              setDialogoChave({ aberto: true, motivo: chave ? "recusada" : "faltando" })
              return
            }
            toast.error(`Não foi possível atualizar o status do chamado ${chamado.id_chamado}`, {
              description: mensagemDeErro(erro),
            })
            // 409/404: a lista está velha (outra pessoa ou o robô mudou o chamado). Busca de novo.
            if (erro instanceof ErroApi && (erro.status === 409 || erro.status === 404)) void recarregar()
          },
        },
      )
    },
    [atualizar, chave, recarregar],
  )

  // Depois de salvar a chave pedida por um 401, refaz a troca que estava esperando. Roda quando a
  // chave muda e depois do efeito do useMutation (declarado antes), então a mutação já usa a chave nova.
  useEffect(() => {
    const troca = repetir.current
    if (!troca || !chave) return
    repetir.current = null
    enviar(troca.chamado, troca.status)
  }, [chave, enviar])

  // Os diálogos abrem por código (sem DialogTrigger): ao fechar, o foco volta ao controle que os abriu
  // ou, se a linha saiu da lista, à aba atual.
  const devolverFoco = (evento: Event) => {
    evento.preventDefault()
    const alvo = retornoFoco.current
    if (alvo?.isConnected) alvo.focus()
    else focarAbaAtiva(refAbas.current)
  }

  // Depois de uma troca, a linha pode sair da aba (ex.: concluído em "Em aberto") e levar o foco junto:
  // nesse caso o foco vai para a aba atual em vez de cair no <body>.
  useEffect(() => {
    const alvo = retornoFoco.current
    if (!alvo || alvo.isConnected || document.activeElement !== document.body) return
    retornoFoco.current = null
    focarAbaAtiva(refAbas.current)
  }, [visiveis])

  const pedir = useCallback(
    (chamado: Chamado, status: StatusChamado) => {
      retornoFoco.current = elementoFocado()
      if (status === "cancelado") setCancelando(chamado)
      else enviar(chamado, status)
    },
    [enviar],
  )

  const atualizandoId = atualizando ? (variables?.id ?? null) : null
  const legenda = `${definicaoAba.rotulo === "Todos" ? "Todos os chamados" : `Chamados ${definicaoAba.rotulo.toLocaleLowerCase("pt-BR")}`}, ${
    area ? `área ${nomeArea(area)}` : "todas as áreas"
  }`

  let conteudo
  if (consulta.isPending) {
    conteudo = <EsqueletoTabela colunas={8} linhas={8} rotulo="Carregando os chamados…" />
  } else if (consulta.isError) {
    conteudo = (
      <EstadoErro
        titulo="Não foi possível carregar os chamados"
        erro={consulta.error}
        aoTentarDeNovo={consulta.refetch}
        tentando={consulta.isRefetching}
      />
    )
  } else if (visiveis.length === 0) {
    const filaAqui = `/fila?area=${encodeURIComponent(area ?? VALOR_TODAS)}`
    conteudo = (
      <EstadoVazio
        titulo={`${definicaoAba.vazio} ${area ? "nesta área" : "nas áreas-piloto"}`}
        descricao={
          aba === "em_aberto"
            ? "O robô abre chamados a partir da fila de manutenção. Veja na fila o que ainda não tem chamado."
            : "Troque de aba ou de área para ver outros chamados."
        }
        acao={
          aba === "em_aberto" ? (
            <Button asChild variant="outline">
              <Link to={filaAqui}>Ver a fila de manutenção</Link>
            </Button>
          ) : undefined
        }
      />
    )
  } else if (!telaLarga) {
    conteudo = <ListaChamados itens={visiveis} legenda={legenda} aoPedir={pedir} atualizandoId={atualizandoId} />
  } else {
    conteudo = <TabelaChamados itens={visiveis} legenda={legenda} aoPedir={pedir} atualizandoId={atualizandoId} />
  }

  return (
    <>
      <PageHeader
        titulo={TITULO}
        descricao={
          <p>
            Abertos pelo robô a partir da fila e acompanhados pelo gestor. Prazo de reparo: 5 dias para luminária
            apagada e 10 dias para iluminação insuficiente, contados da abertura.
          </p>
        }
        acoes={
          <>
            <AreaToggle permitirTodas />
            <BotaoChave temChave={Boolean(chave)} aoAbrir={() => {
                retornoFoco.current = elementoFocado()
                pendente.current = null
                repetir.current = null
                setDialogoChave({ aberto: true, motivo: "manual" })
              }}
            />
          </>
        }
      />

      <Tabs value={aba} onValueChange={trocarAba} className="gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
          {/* No celular as quatro abas viram uma grade 2 x 2: nada rola na horizontal. */}
          <TabsList
            ref={refAbas}
            aria-label="Status dos chamados"
            className="max-md:grid max-md:w-full max-md:grid-cols-2 max-md:gap-1 max-md:group-data-horizontal/tabs:h-auto"
          >
              {ABAS.map((item) => (
                <TabsTrigger key={item.valor} value={item.valor} className="px-3 max-md:h-11">
                  {item.rotulo}
                  {consulta.isSuccess && (
                    // Herda a cor da aba (muted na inativa, foreground na ativa): >= 5:1 nos dois temas.
                    <span className="text-xs font-normal tabular-nums">
                      <span className="sr-only">, </span>
                      {formatarNumero(contagens[item.valor], 0)}
                    </span>
                  )}
                </TabsTrigger>
              ))}
          </TabsList>
          <p role="status" className="text-sm text-muted-foreground tabular-nums">
            {consulta.isSuccess && visiveis.length > 0 ? textoResumo(visiveis.length, atrasados) : ""}
          </p>
        </div>
        {ABAS.map((item) => (
          <TabsContent key={item.valor} value={item.valor}>
            {item.valor === aba && conteudo}
          </TabsContent>
        ))}
      </Tabs>

      <DialogoCancelar
        idChamado={cancelando?.id_chamado ?? null}
        aoVoltar={() => setCancelando(null)}
        aoDevolverFoco={devolverFoco}
        aoConfirmar={() => {
          if (cancelando) enviar(cancelando, "cancelado")
          setCancelando(null)
        }}
      />

      <DialogoChave
        aberto={dialogoChave.aberto}
        motivo={dialogoChave.motivo}
        aoDevolverFoco={devolverFoco}
        aoMudarAberto={(aberto) => setDialogoChave((atual) => ({ ...atual, aberto }))}
        aoSalvar={() => {
          repetir.current = pendente.current
          pendente.current = null
        }}
      />
    </>
  )
}
