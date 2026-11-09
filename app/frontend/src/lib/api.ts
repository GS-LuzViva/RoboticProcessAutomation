/**
 * Camada HTTP do LuzViva: `pedir()` faz fetch com tempo limite, lê o JSON e transforma qualquer
 * falha em `ErroApi` com mensagem amigável em pt-BR (o que houve e o que fazer).
 * As funções `api.*` abaixo são as únicas que conhecem as rotas; os hooks usam só elas.
 */
import type {
  AlteracaoChamado,
  Area,
  Chamado,
  Envelope,
  ItemFila,
  ListaChamados,
  Luminaria,
  NovoRelato,
  Ocorrencia,
  PainelArea,
  Pergunta,
  RespostaAssistente,
  StatusChamado,
} from "@/lib/tipos"

/** Tempo limite padrão (15 s) e o das rotas lentas, foto e assistente (30 s). */
export const TEMPO_PADRAO_MS = 15_000
export const TEMPO_LONGO_MS = 30_000

export type TipoErroApi = "http" | "tempo_esgotado" | "sem_conexao"

const MENSAGENS_STATUS: Record<number, string> = {
  400: "O pedido não foi aceito pelo servidor. Confira os dados e tente de novo.",
  401: "Chave do gestor ausente ou inválida. Informe a chave do gestor e tente de novo.",
  403: "Esta ação não é permitida com a chave informada.",
  404: "Registro não encontrado. Atualize a lista e tente de novo.",
  409: "A ação conflita com o estado atual. Atualize a lista e confira antes de tentar de novo.",
  413: "Foto grande demais. Envie uma foto de até 5 MB.",
  415: "Formato não aceito. Envie uma foto JPEG ou PNG.",
  422: "Alguns dados não passaram na validação. Confira os campos e tente de novo.",
  503: "Os dados desta tela ainda não foram publicados pelo processamento diário. Tente de novo mais tarde.",
}

/** Erro de qualquer chamada à API. `message` já vem pronta para mostrar ao usuário. */
export class ErroApi extends Error {
  /** Status HTTP; 0 quando não houve resposta (tempo esgotado ou sem conexão). */
  readonly status: number
  readonly tipo: TipoErroApi
  /** Texto do `detail` do FastAPI, quando houver (já incluído em `message`). */
  readonly detalhe?: string
  /** `detail` original, para quem precisa de um campo (ex.: `id_chamado` num 409). */
  readonly corpo?: unknown

  constructor(mensagem: string, opcoes: { status: number; tipo: TipoErroApi; detalhe?: string; corpo?: unknown }) {
    super(mensagem)
    this.name = "ErroApi"
    this.status = opcoes.status
    this.tipo = opcoes.tipo
    this.detalhe = opcoes.detalhe
    this.corpo = opcoes.corpo
  }
}

/** Mensagem amigável para qualquer erro (ErroApi ou inesperado). */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroApi) return erro.message
  return "Algo deu errado ao falar com o servidor. Tente de novo."
}

interface ErroValidacao {
  loc?: (string | number)[]
  msg?: string
}

/** Converte o `detail` do FastAPI (texto, objeto ou lista de erros 422) em texto legível. */
export function textoDetalhe(detail: unknown): string {
  if (detail === null || detail === undefined || detail === "") return ""
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: ErroValidacao | string) => {
        if (typeof item === "string") return item
        const campo = item.loc?.filter((parte) => parte !== "body" && parte !== "query").join(".")
        const msg = item.msg ?? ""
        return campo ? `${campo}: ${msg}` : msg
      })
      .filter(Boolean)
      .join("; ")
  }
  if (typeof detail === "object") {
    const objeto = detail as Record<string, unknown>
    const texto = objeto.erro ?? objeto.mensagem ?? objeto.message
    if (typeof texto === "string") return texto
    return JSON.stringify(detail)
  }
  return String(detail)
}

export interface OpcoesPedido {
  metodo?: "GET" | "POST" | "PATCH" | "DELETE"
  /** Corpo JSON (serializado aqui, com Content-Type). */
  json?: unknown
  /** Corpo multipart (o navegador define o Content-Type). */
  formulario?: FormData
  cabecalhos?: Record<string, string>
  /** Tempo limite em ms (padrão 15 s). */
  tempoMs?: number
  /** Sinal externo (o TanStack Query cancela consultas por ele). */
  signal?: AbortSignal
}

/**
 * fetch com tempo limite e erro tipado. Devolve o JSON da resposta como `T`.
 * Lança `ErroApi` em erro HTTP, tempo esgotado ou falta de conexão. Cancelamento pelo `signal`
 * externo é repassado como o `AbortError` original (o TanStack Query sabe tratar).
 */
export async function pedir<T>(caminho: string, opcoes: OpcoesPedido = {}): Promise<T> {
  const { metodo = "GET", json, formulario, cabecalhos = {}, tempoMs = TEMPO_PADRAO_MS, signal } = opcoes
  const controle = new AbortController()
  let esgotou = false
  const relogio = setTimeout(() => {
    esgotou = true
    controle.abort()
  }, tempoMs)
  const repassarCancelamento = () => controle.abort()
  if (signal) {
    if (signal.aborted) controle.abort()
    else signal.addEventListener("abort", repassarCancelamento, { once: true })
  }

  const headers: Record<string, string> = { Accept: "application/json", ...cabecalhos }
  let body: BodyInit | undefined
  if (formulario) body = formulario
  else if (json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(json)
  }

  try {
    let resposta: Response
    try {
      resposta = await fetch(caminho, { method: metodo, headers, body, signal: controle.signal })
    } catch (erro) {
      if (esgotou) {
        throw new ErroApi(
          `O servidor não respondeu em ${Math.round(tempoMs / 1000)} s. Verifique a conexão e tente de novo.`,
          { status: 0, tipo: "tempo_esgotado" },
        )
      }
      if (signal?.aborted) throw erro
      throw new ErroApi("Sem conexão com o servidor. Verifique a internet e tente de novo.", {
        status: 0,
        tipo: "sem_conexao",
      })
    }

    let dados: unknown = null
    const texto = await resposta.text()
    if (texto) {
      try {
        dados = JSON.parse(texto)
      } catch {
        dados = null
      }
    }

    if (!resposta.ok) {
      const base =
        MENSAGENS_STATUS[resposta.status] ??
        (resposta.status >= 500
          ? `O servidor respondeu com erro ${resposta.status}. Tente de novo em instantes.`
          : `O servidor recusou o pedido (erro ${resposta.status}). Confira os dados e tente de novo.`)
      const corpo = dados && typeof dados === "object" ? (dados as { detail?: unknown }).detail : undefined
      const detalhe = textoDetalhe(corpo)
      throw new ErroApi(detalhe ? `${base} Detalhe: ${detalhe}.` : base, {
        status: resposta.status,
        tipo: "http",
        detalhe: detalhe || undefined,
        corpo,
      })
    }
    return dados as T
  } finally {
    clearTimeout(relogio)
    signal?.removeEventListener("abort", repassarCancelamento)
  }
}

/** Monta `?a=1&b=2` ignorando valores vazios. */
function consulta(parametros: Record<string, string | undefined | null>): string {
  const busca = new URLSearchParams()
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor) busca.set(chave, valor)
  }
  const texto = busca.toString()
  return texto ? `?${texto}` : ""
}

/** Resposta usada quando o assistente falha por qualquer motivo (mesma forma da API). */
export const ASSISTENTE_INDISPONIVEL: RespostaAssistente = {
  resposta: "Assistente indisponível no momento",
  fontes: [],
  recusou: true,
  confianca: 0,
}

/** Rotas da API. Caminhos relativos à origem (o FastAPI serve site e API juntos). */
export const api = {
  luminarias(filtros: { area?: Area; situacao?: string; placa?: string } = {}, signal?: AbortSignal) {
    return pedir<Envelope<Luminaria>>(
      `/api/luminarias${consulta({ subprefeitura: filtros.area, situacao: filtros.situacao, placa: filtros.placa })}`,
      { signal },
    )
  },

  fila(area?: Area, signal?: AbortSignal) {
    return pedir<Envelope<ItemFila>>(`/api/fila${consulta({ subprefeitura: area })}`, { signal })
  },

  painel(signal?: AbortSignal) {
    return pedir<Envelope<PainelArea>>("/api/painel", { signal })
  },

  chamados(filtros: { status?: StatusChamado[]; placa?: string; area?: Area } = {}, signal?: AbortSignal) {
    return pedir<ListaChamados>(
      `/api/chamados${consulta({
        status: filtros.status?.length ? filtros.status.join(",") : undefined,
        placa: filtros.placa,
        area_piloto: filtros.area,
      })}`,
      { signal },
    )
  },

  chamado(id: string, signal?: AbortSignal) {
    return pedir<Chamado>(`/api/chamados/${encodeURIComponent(id)}`, { signal })
  },

  atualizarChamado(id: string, alteracao: AlteracaoChamado, chaveGestor?: string) {
    return pedir<Chamado>(`/api/chamados/${encodeURIComponent(id)}`, {
      metodo: "PATCH",
      json: alteracao,
      cabecalhos: chaveGestor ? { "X-API-Key": chaveGestor } : {},
    })
  },

  enviarRelato(relato: NovoRelato) {
    const formulario = new FormData()
    formulario.set("foto", relato.foto)
    if (relato.categoria) formulario.set("categoria", relato.categoria)
    if (relato.placa) formulario.set("placa", relato.placa.trim().toUpperCase())
    if (relato.lat !== undefined && relato.lon !== undefined) {
      formulario.set("lat", String(relato.lat))
      formulario.set("lon", String(relato.lon))
    }
    if (relato.area_piloto) formulario.set("area_piloto", relato.area_piloto)
    return pedir<Ocorrencia>("/api/fotos", { metodo: "POST", formulario, tempoMs: TEMPO_LONGO_MS })
  },

  /** Nunca rejeita: qualquer falha vira `ASSISTENTE_INDISPONIVEL`, para a tela continuar de pé. */
  async perguntar(pergunta: Pergunta): Promise<RespostaAssistente> {
    try {
      const resposta = await pedir<Partial<RespostaAssistente> | null>("/api/assistente", {
        metodo: "POST",
        json: pergunta,
        tempoMs: TEMPO_LONGO_MS,
      })
      if (!resposta || typeof resposta.resposta !== "string") return ASSISTENTE_INDISPONIVEL
      return {
        resposta: resposta.resposta,
        fontes: Array.isArray(resposta.fontes) ? resposta.fontes : [],
        recusou: Boolean(resposta.recusou),
        confianca: typeof resposta.confianca === "number" ? resposta.confianca : 0,
      }
    } catch {
      return ASSISTENTE_INDISPONIVEL
    }
  },
}
