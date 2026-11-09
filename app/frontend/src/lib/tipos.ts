/**
 * Tipos dos contratos da API do LuzViva (docs/especificacao_api.md e docs/contrato_mvp_dados.md).
 * Datas chegam como ISO 8601 sem fuso, já no horário de São Paulo ("2026-11-10T19:24:10").
 */

/** Área-piloto, como a API devolve (maiúsculas, sem acento). */
export type Area = "SE" | "PINHEIROS" | "CAMPO LIMPO"

/** Situação da luminária calculada pelo pipeline. */
export type Situacao = "ok" | "insuficiente" | "apagada" | "sem_medicao"

/** Situação que gera chamado (fila e chamados só têm estas duas). */
export type SituacaoComFalha = "apagada" | "insuficiente"

export type StatusChamado = "aberto" | "em_atendimento" | "concluido" | "cancelado"

/** Categoria de ocorrência aceita pela API (contrato 2). */
export type CategoriaOcorrencia =
  | "luminaria_apagada"
  | "luminaria_acesa"
  | "luminaria_acesa_de_dia"
  | "luminaria_piscando"
  | "poste_danificado"
  | "fiacao_exposta"

/** Texto ISO 8601 sem fuso, horário de São Paulo. */
export type DataHoraIso = string

/** Envelope das views do pipeline (`/api/luminarias`, `/api/fila`, `/api/painel`). */
export interface Envelope<T> {
  view: string
  gerado_em: DataHoraIso
  linhas: number
  dados: T[]
}

/** Linha de `vw_mvp_mapa_luminarias` (GET /api/luminarias). */
export interface Luminaria {
  id_luminaria: number
  placa: string | null
  endereco: string | null
  subprefeitura: Area
  lat: number
  lon: number
  ultima_medicao: DataHoraIso | null
  ultimo_lux: number | null
  situacao: Situacao
  ocorrencias_app: number
}

/**
 * Linha de `vw_mvp_fila_manutencao` (GET /api/fila), já ordenada por prioridade desc.
 * `chamado_aberto` e `status_chamado` vêm do banco de chamados (estado atual).
 */
export interface ItemFila extends Luminaria {
  chamado_aberto: string | null
  status_chamado: StatusChamado | null
  /** Confiança da visão computacional, 0..1. */
  confianca_visao: number | null
  /** 0..100. */
  prioridade: number
}

/** Linha de `vw_mvp_painel_subprefeitura` (GET /api/painel). */
export interface PainelArea {
  subprefeitura: Area
  luminarias_cadastradas: number
  luminarias_inspecionadas: number
  apagadas: number
  insuficientes: number
  /** Percentual 0..100 sobre as inspecionadas. */
  pct_com_falha: number
  mediana_horas_ate_reparo: number | null
  chamados_em_aberto: number
}

/** Chamado de manutenção (contrato 3). */
export interface Chamado {
  id_chamado: string
  placa: string
  area_piloto: Area
  prioridade: number
  situacao_detectada: SituacaoComFalha
  status: StatusChamado
  aberto_em: DataHoraIso
  atualizado_em: DataHoraIso
  concluido_em: DataHoraIso | null
  equipe: string | null
  origem: string
}

/** Resposta de GET /api/chamados. */
export interface ListaChamados {
  linhas: number
  dados: Chamado[]
}

/** Corpo do PATCH /api/chamados/{id}: só estes campos. */
export interface AlteracaoChamado {
  status?: StatusChamado
  equipe?: string
  concluido_em?: DataHoraIso
}

/** Ocorrência gravada (contrato 2), devolvida por POST /api/fotos. */
export interface Ocorrencia {
  id_ocorrencia: string
  data_hora: DataHoraIso
  categoria: CategoriaOcorrencia
  origem: "app_foto_cidadao" | "camera_visao"
  confianca_visao: number | null
  modelo_visao: string | null
  foto_id: string
  lat: number
  lon: number
  area_piloto: Area
  placa: string | null
}

/** Campos do relato com foto (POST /api/fotos, multipart). */
export interface NovoRelato {
  foto: File
  categoria?: CategoriaOcorrencia
  /** Placa ILUME, `^IP\d{7}$`. */
  placa?: string
  lat?: number
  lon?: number
  area_piloto?: Area
}

/** Entrada do assistente (contrato 4). */
export interface Pergunta {
  pergunta: string
  placa?: string
}

export interface FonteAssistente {
  titulo?: string
  trecho?: string
}

/** Saída do assistente (contrato 4). */
export interface RespostaAssistente {
  resposta: string
  fontes: FonteAssistente[]
  /** true quando a resposta não consta na base (mostrar badge "Não consta na base"). */
  recusou: boolean
  /** 0..1. */
  confianca: number
}
