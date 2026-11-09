# PDD: Process Design Document do robô de RPA do LuzViva

| Item | Valor |
|---|---|
| Processo | Abertura e acompanhamento de chamados de manutenção de iluminação pública |
| Versão | 1.0 (novembro de 2026) |
| Responsável | Caíque Walter Silva (RM550693) |
| Equipe | Caíque Walter Silva (RM550693), Matheus José de Lima Costa (RM551157), João Paulo Fonseca Zamperlini (RM99279), Guilherme Monteiro Espim (RM99499), Guilherme Nobre Bernardo (RM98604) |
| Disciplina | Robotic Process Automation (Bruno Diniz e Cibele Ribeiro) |
| Tecnologia | Python 3 (`requests`, `logging`, `pathlib`, `zoneinfo`), agendador do sistema operacional |
| Fluxo | [`processo.bpmn`](processo.bpmn) e [`bpmn.md`](bpmn.md) |

## 1. Contexto e objetivo

A cidade só descobre que uma luminária apagou quando alguém reclama. O LuzViva junta medições de um
robô com sensor de luz (LDR), fotos do cidadão confirmadas por visão computacional e o cadastro ILUME
numa **fila de manutenção priorizada** (0 a 100). Alguém precisa transformar essa fila em chamados,
cobrar o prazo das equipes e confirmar o reparo. Esse é o processo automatizado aqui.

Objetivo: nenhuma luminária com falha confirmada fica sem chamado por mais de uma hora, todo chamado
é acompanhado contra o prazo e só é encerrado com evidência de medição.

Benefício ao cidadão: a rua escura vira chamado sem depender de reclamação, e o atraso vira alerta
para o gestor em vez de ficar esquecido.

## 2. AS-IS (manual)

| # | Passo | Quem | Tempo estimado |
|---|---|---|---|
| 1 | Abrir a planilha/lista de luminárias com problema | Analista da zeladoria | 1 min |
| 2 | Para cada poste, conferir se já existe chamado aberto (busca por endereço) | Analista | 2 min |
| 3 | Preencher o chamado (placa, endereço, gravidade) e escolher a equipe da região | Analista | 2 min |
| 4 | Dia seguinte: marcar como "em atendimento" após confirmar com a equipe | Analista | 2 min |
| 5 | Cobrar a equipe quando o prazo vence (telefone, e-mail) | Analista | 4 min |
| 6 | Conferir se o reparo foi feito (relato da equipe ou nova reclamação) e encerrar | Analista | 4 min |

Total estimado: cerca de 15 minutos por chamado ao longo da vida dele (estimativa do grupo, ver
[`roi.md`](roi.md)). Problemas: duplicidade (o mesmo poste aberto duas vezes), prazo esquecido, chamado
encerrado sem evidência, e só funciona em horário comercial.

## 3. TO-BE (automatizado)

Robô Python agendado de hora em hora, sem interface gráfica, que conversa só com a API REST do app
LuzViva. A pessoa (gestor) fica no circuito para o que exige julgamento: os escalonamentos.

### 3.1 Início e gatilho

Evento de timer: Agendador de Tarefas do Windows (`schtasks /SC HOURLY`) ou `cron` (`0 * * * *`), ou o
próprio robô em laço (`--intervalo`). Cada disparo é uma execução independente e idempotente.

### 3.2 Entradas

| Entrada | Origem | Formato |
|---|---|---|
| Fila de manutenção | `GET /api/fila` (view `vw_mvp_fila_manutencao` do pipeline) | Envelope `{"view","gerado_em","linhas","dados":[...]}` com `placa, subprefeitura, situacao, prioridade, chamado_aberto, status_chamado, ...` |
| Chamados em aberto | `GET /api/chamados?status=aberto,em_atendimento` | `{"linhas","dados":[chamado]}` (contrato 3) |
| Situação das luminárias | `GET /api/luminarias` (view `vw_mvp_mapa_luminarias`) | Envelope com `placa, situacao (ok, insuficiente, apagada, sem_medicao), ultima_medicao` |
| Configuração | Variáveis de ambiente | `LUZVIVA_API_URL` (obrigatória), `LUZVIVA_API_TOKEN` (opcional) |

### 3.3 Etapas

| # | Etapa | Componente |
|---|---|---|
| 1 | Ler a fila e validar o envelope | `cliente.obter_fila`, `regras.validar_envelope` |
| 2 | Ler os chamados em aberto (para não duplicar) | `cliente.obter_chamados_abertos` |
| 3 | Para cada item da fila: validar, decidir e, se for o caso, abrir o chamado | `regras.decidir_item`, `regras.montar_chamado`, `cliente.abrir_chamado` |
| 4 | Ler chamados em aberto e luminárias | `cliente.obter_chamados_abertos`, `cliente.obter_luminarias` |
| 5 | Para cada chamado: decidir conclusão, escalonamento e mudança para em atendimento | `regras.decidir_chamado`, `cliente.atualizar_chamado` |
| 6 | Gravar escalonamentos do dia e resumo da execução; registrar resumo no log | `execucao.executar` |

### 3.4 Decisões

**Item da fila** (avaliadas nesta ordem, primeira que se aplica):

| Condição | Resultado | Contador |
|---|---|---|
| Item não é objeto, placa ausente ou fora de `^IP\d{7}$`, prioridade não numérica ou fora de 0..100, subprefeitura fora de SE, PINHEIROS, CAMPO LIMPO | Não abre; registra WARNING | `invalidos` |
| Placa já apareceu antes na mesma fila (poste com mais de um ponto) | Processa só a primeira ocorrência | `duplicados` |
| Prioridade < 30 | Registra para monitorar | `monitorar` |
| Situação diferente de `apagada` ou `insuficiente` | Registra para monitorar (o contrato do chamado só aceita essas duas) | `monitorar` |
| Placa com chamado `aberto`/`em_atendimento` (lista da API ou campos `chamado_aberto`/`status_chamado` da fila) | Não abre | `duplicados` |
| Prioridade >= 30 e sem chamado | `POST /api/chamados` | `abertos` |
| POST respondeu 409 | Chamado já existia: não é erro | `duplicados` |

**Chamado em aberto**:

| Condição | Resultado | Contador |
|---|---|---|
| Luminárias da placa com `situacao == "ok"` e `ultima_medicao > aberto_em`, e nenhum ponto da placa ainda `apagada`/`insuficiente` | `PATCH status=concluido`, `concluido_em` = momento da medição que confirmou o reparo | `concluidos` |
| Dias desde `aberto_em` > prazo (5 apagada, 10 insuficiente) | Escala: log WARNING + `saida/escalonamentos_AAAA-MM-DD.json` | `escalados` |
| Status `aberto` e 1 dia ou mais desde `aberto_em` | `PATCH status=em_atendimento` (preenche a equipe se faltar) | `em_atendimento` |

### 3.5 Repetições

Duas repetições sobre coleções, ambas sequenciais (subprocessos multi-instância no BPMN):
sobre os itens da fila e sobre os chamados em aberto. Cada iteração é isolada: erro num item não
interrompe as demais. Fora disso, o próprio agendamento repete o processo a cada hora.

### 3.6 Saídas

| Saída | Consumidor |
|---|---|
| Chamados criados e atualizados na API do app (`POST`/`PATCH /api/chamados`) | Site (tela de chamados e fila), arquivo do dia `chamados_rpa` lido pelo pipeline de dados (tempo até o reparo, `reparo_confirmado_pelo_robo`) |
| `logs/rpa_AAAA-MM-DD.log` | Auditoria e operação |
| `saida/execucao_AAAAMMDD_HHMMSS.json` | Monitoramento e cálculo do AHT do robô (ROI) |
| `saida/escalonamentos_AAAA-MM-DD.json` | Gestor (pessoa no circuito) para cobrar a equipe |

## 4. Regras de negócio

Fixadas na especificação da API do app (`luzviva-app/docs/especificacao_api.md`, "Regras do RPA") e
centralizadas em `src/luzviva_rpa/config.py`:

| Regra | Valor |
|---|---|
| Corte para abrir chamado | prioridade >= 30 e sem chamado aberto/em atendimento para a placa |
| Prioridade (calculada pelo pipeline) | apagada 60 / insuficiente 30, +10 por relato de cidadão (máx. 30), +10 se a visão confirmou com confiança >= 0,8 |
| Um chamado aberto por placa | garantido pelo robô e pela API (409) |
| Identificador do chamado | `CH-AAAAMMDD-<placa>` |
| Equipe por área | SE → EQUIPE-CENTRO, PINHEIROS → EQUIPE-OESTE, CAMPO LIMPO → EQUIPE-SUL |
| Em atendimento | chamado `aberto` há 1 dia ou mais |
| Prazo de reparo | 5 dias para apagada, 10 para insuficiente, contados de `aberto_em` |
| Escalonamento | prazo vencido → WARNING + arquivo de escalonamentos (sem campo novo no contrato) |
| Conclusão | `/api/luminarias` mostra `ok` com `ultima_medicao > aberto_em` |
| Datas | ISO 8601 sem fuso, horário de São Paulo (`zoneinfo` + `tzdata`) |

## 5. Exceções e recuperação

| Exceção | Detecção | Tratamento | Recuperação |
|---|---|---|---|
| API fora do ar (rede, timeout de 20 s, 5xx, 429) | `requests.ConnectionError`/`Timeout`, status | 4 tentativas com espera exponencial 2, 4, 8 s; WARNING a cada tentativa; depois `ApiIndisponivel` | A fase é abortada com ERROR; a outra fase roda; o resumo é gravado; próxima execução (1 h) tenta de novo |
| Fila com JSON inválido ou corpo vazio | `RespostaInvalida` | ERROR, fase da fila abortada | Acompanhamento dos chamados continua |
| Fila sem `dados` ou `dados` não é lista | `EnvelopeInvalido` | ERROR, fase da fila abortada | Idem |
| Fila vazia | `dados == []` | WARNING (não é erro) | Nada a abrir |
| `linhas` diferente do tamanho da lista | comparação no envelope | WARNING "fila inconsistente", processa o que veio | Pipeline corrige na próxima carga |
| Item inconsistente (placa, prioridade 150, área) | `regras.validar_item` | WARNING, conta `invalidos`, placa só é logada se tiver formato ILUME | Pipeline corrige na próxima carga |
| Placa repetida na fila | conjunto `vistas` | Processa uma vez, conta `duplicados` | |
| Chamado já existe | lista da API, campos da fila ou HTTP 409 | Conta `duplicados`, não é erro | |
| Falha no POST/PATCH de um item (incl. 401, 422, 409 de transição) | `ErroApi` | ERROR com placa/id, conta `falhas`, segue o laço | Próxima execução reavalia o item |
| Chamado da API sem `aberto_em` válido | `ChamadoInconsistente` | WARNING, conta `falhas` | Corrigir na API |
| Luminárias indisponíveis | `ErroApi`/`EnvelopeInvalido` | WARNING; nenhuma conclusão nesta execução, mas em atendimento e escalonamento seguem | Próxima execução |
| Falta `LUZVIVA_API_URL` | `ConfiguracaoInvalida` | ERROR, código de saída 2 | Configurar a variável |
| Erro inesperado | `Exception` no topo | `log.exception`, código de saída 1 | Agendador roda de novo na hora seguinte |

Idempotência: rodar duas vezes não duplica nada (teste `test_execucao_ponta_a_ponta_e_idempotente`).
Repetir um POST depois de um 5xx é seguro porque a API devolve 409 se o chamado já foi gravado.

## 6. Logs e auditoria

- Arquivo `logs/rpa_AAAA-MM-DD.log` (um por dia, UTF-8, horário de São Paulo) e console, com `logging`
  e `pathlib`; não há `print` no código.
- Cada linha: data/hora, nível, evento. Eventos: início, itens lidos, decisão por item com placa e
  prioridade, chamado aberto (id, placa, prioridade, equipe), atualização (id, status, motivo),
  escalonamento (id, placa, área, dias, prazo), falhas por tentativa, erros de fase e o resumo final
  com todas as contagens e a duração.
- Níveis: INFO (fluxo normal), WARNING (tentativa falhou, item inválido, escalonamento, fila vazia),
  ERROR (falha de item, fase abortada).
- O JSON de resumo de cada execução guarda `inicio`, `fim`, `duracao_s`, contagens e erros: é a trilha
  de auditoria legível por máquina e a medida do AHT do robô.
- Amostras reais sem dado pessoal: `logs/exemplo_execucao_sucesso.log` e `logs/exemplo_falha_api.log`.

## 7. Segurança e LGPD

- Minimização: o robô só usa e só registra placa da luminária, id do chamado, prioridade, área,
  status e contagens. Placa é dado do poste, não da pessoa.
- O chamado montado pelo robô copia apenas os campos do contrato 3; qualquer outro campo do item
  (por exemplo um `cidadao` enviado por engano) é descartado (teste `test_montar_chamado_segue_contrato_e_equipe_por_area`).
- Placa fora do padrão aparece no log como `<invalida>`, porque pode ser texto digitado por cidadão.
- Defesa em profundidade: um filtro de log troca qualquer e-mail por `<email-removido>`
  (teste `test_log_nao_tem_dado_de_cidadao` com nome, e-mail e telefone no item).
- Mensagens de erro HTTP registram método, rota e status, nunca o corpo da resposta.
- Segredos: URL e token só por variável de ambiente; o token vai no header `X-API-Key` e nunca é
  logado (o log diz apenas "token=definido"). `.env` está no `.gitignore`.
- Comunicação: em produção a API é HTTPS; timeout de 20 s evita o robô preso.

## 8. Integração com o MVP

- O destino é a **API do próprio app LuzViva**, nunca o SP156 real da Prefeitura: o robô demonstra o
  processo sem gerar chamado indevido no sistema público.
- Rotas usadas: `GET /api/fila`, `GET /api/luminarias`, `GET /api/chamados?status=aberto,em_atendimento`,
  `POST /api/chamados` (201 ou 409), `PATCH /api/chamados/{id}` (`status`, `equipe`, `concluido_em`).
- O que o robô grava é consumido por outros componentes: o site mostra os chamados e a coluna
  `chamado_aberto`/`status_chamado` da fila; a API grava `dados_dia/chamados_rpa/chamados_rpa_AAAA-MM-DD.json`,
  que o pipeline de dados lê para calcular o tempo até o reparo e o painel por subprefeitura.
- Enquanto o app não estiver publicado, `tests/api_simulada.py` reproduz as mesmas rotas e regras (dados
  simulados) para teste e demonstração.

## 9. Premissas e limites

- Uma placa pode ter mais de um ponto de luz: a conclusão exige que nenhum ponto da placa siga com falha.
- Se um chamado for concluído e a mesma placa falhar de novo no mesmo dia, o id `CH-AAAAMMDD-<placa>`
  colide e a API responde 409; o robô registra como duplicado e o item volta a ser avaliado no dia seguinte.
- O escalonamento não muda o contrato do chamado: é um alerta para o gestor (log + arquivo do dia).
