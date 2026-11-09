# Especificação da API do app LuzViva (fonte da verdade para site, RPA e demais componentes)

Este documento fecha os detalhes que o roteiro deixou "a critério de quem implementa".
Os contratos de dados (seção 4 do roteiro e `contrato_mvp_dados.md`) **não mudam**: nenhum
campo novo nos JSON dos contratos 1 a 5. O que está aqui são decisões de comportamento.

## Convenções

- Datas: ISO 8601 sem fuso, no horário de São Paulo (`2026-11-10T19:24:10`). Use
  `zoneinfo.ZoneInfo("America/Sao_Paulo")` (pacote `tzdata` no requirements, obrigatório no Windows).
- Área (`area_piloto`, `subprefeitura`): `SE`, `PINHEIROS`, `CAMPO LIMPO` (maiúsculas, sem acento).
  Na fila, `subprefeitura` tem o mesmo valor de `area_piloto`.
- Placa ILUME: regex `^IP\d{7}$`.
- Configuração só por variável de ambiente (ver tabela no fim).
- Erros: JSON `{"detail": "..."}` (padrão FastAPI) ou lista de erros de validação (422).
  Nunca stack trace.

## Rotas

| Rota | Sucesso | Erros | Observação |
|---|---|---|---|
| `GET /health` | 200 `{"status":"ok","views":{"vw_mvp_mapa_luminarias":true,...}}` | - | nunca falha por falta de view |
| `GET /metrics` | 200 texto Prometheus | - | `prometheus-fastapi-instrumentator` |
| `GET /api/luminarias?subprefeitura=&situacao=&placa=` | 200 envelope da view | 503 se o JSON da view não existe | filtros opcionais, case-insensitive |
| `GET /api/fila?subprefeitura=` | 200 envelope, `dados` ordenado por `prioridade` desc | 503 | `chamado_aberto` e `status_chamado` são **sobrepostos** com o estado atual do banco de chamados (o pipeline só atualiza 1x/dia) |
| `GET /api/painel` | 200 envelope | 503 | |
| `POST /api/medicoes` | 201 `{"ok":true,"id":...}`; 200 `{"ok":true,"id":...,"duplicado":true}` se o `id_medicao` já está no arquivo do dia | 422 | grava em `dados_dia/medicoes_robo/medicoes_robo_AAAA-MM-DD.json` |
| `POST /api/ocorrencias` | 201 / 200 duplicado (mesma regra) | 422 | grava em `dados_dia/ocorrencias_app/...`; **descarta qualquer campo `cidadao`** (minimização LGPD) |
| `POST /api/fotos` (multipart, campo `foto`; campos de formulário opcionais `categoria`, `placa`, `lat`, `lon`, `area_piloto`) | 201 com a ocorrência gravada (JSON do contrato 2) | 413 (>5 MB), 415 (não jpeg/png), 422 | rota interna do site: reencoda a imagem com Pillow (remove EXIF/GPS), gera `foto_id` = `secrets.token_hex(8)`, salva em `LUZVIVA_FOTOS/<foto_id>.jpg`; se `VISAO_URL` existe, chama `POST {VISAO_URL}/detectar` (multipart `foto`, timeout 20 s) e usa `categoria`, `confianca_visao`, `modelo_visao`, `placa` da resposta (campos ausentes caem no que o cidadão informou); sem visão ou se ela falhar: `categoria` do cidadão, `confianca_visao: null`, `modelo_visao: null`, `origem: "app_foto_cidadao"`. Com a `placa` (normalizada para maiúsculas) achada no cadastro, `area_piloto` vem do cadastro e `lat`/`lon` são completados quando o cidadão não compartilhou localização; sem placa nem localização → 422. Campo da visão fora do contrato (categoria, confiança fora de 0..1, placa inválida) é ignorado e vale o do cidadão. Imagem acima de 40 MP → 413 |
| `GET /api/chamados?status=&placa=&area_piloto=` | 200 `{"linhas": n, "dados": [...]}` ordenado por `prioridade` desc, depois `aberto_em` | - | `status` aceita lista separada por vírgula (`aberto,em_atendimento`) |
| `GET /api/chamados/{id_chamado}` | 200 chamado | 404 | |
| `POST /api/chamados` | 201 chamado gravado, header `Location` | 409 se já existe chamado `aberto`/`em_atendimento` para a placa (corpo traz `id_chamado` existente em `detail`); 409 se o `id_chamado` já existe; 422 | `id_chamado` opcional: se ausente, `CH-AAAAMMDD-<placa>`; `aberto_em`/`atualizado_em` default = agora; `status` default `aberto`; `origem` default `rpa` |
| `PATCH /api/chamados/{id_chamado}` | 200 chamado atualizado | 404; 409 transição inválida; 422 | aceita `status`, `equipe`, `concluido_em`; atualiza `atualizado_em`; ao ir para `concluido` sem `concluido_em`, usa agora; `concluido_em` em chamado que não fica `concluido` → 422; `concluido_em` não pode ser anterior a `aberto_em` (422) |
| `POST /api/assistente` | 200 contrato 4 (saída) | - | repassa a `{IA_URL}/perguntar`, timeout 20 s; sem `IA_URL` ou em falha: `{"resposta":"Assistente indisponível no momento","fontes":[],"recusou":true,"confianca":0}` |
| `GET /api/export/{fonte}?data=AAAA-MM-DD` | 200 envelope `{"_coleta":{...},"dados":[...]}` | 404 fonte inválida ou arquivo inexistente; 422 data inválida | fontes: `medicoes_robo`, `ocorrencias_app`, `chamados_rpa`; `data` default = hoje |

### Transições de status de chamado

`aberto → em_atendimento | concluido | cancelado`; `em_atendimento → concluido | cancelado`;
`concluido` e `cancelado` são finais (PATCH para outro status → 409). PATCH com o mesmo status é
aceito (idempotente).

### Persistência

- Views do pipeline: `LUZVIVA_DATA/vw_mvp_*.json` (somente leitura pela API).
- Medições e ocorrências: arquivo do dia, envelope `{"_coleta": {"fonte", "data_coleta", "url": "app://luzviva"}, "dados": [...]}`.
  Escrita atômica (arquivo temporário + `replace`) sob um `threading.Lock`.
- Chamados: SQLite (`LUZVIVA_DB`, default `dados_dia/luzviva.db`) é o estado atual; a cada POST/PATCH
  o chamado também é gravado (upsert por `id_chamado`) em
  `dados_dia/chamados_rpa/chamados_rpa_AAAA-MM-DD.json` do dia da alteração, que é o formato que o
  pipeline espera ("um arquivo por dia com os chamados abertos ou alterados naquele dia").

### Segurança

- Se `LUZVIVA_API_TOKEN` estiver definido, `POST /api/medicoes`, `POST /api/chamados`,
  `PATCH /api/chamados/*` e `GET /api/export/*` (ocorrências têm a localização do cidadão, dado
  pessoal pela LGPD; o pipeline envia o header) exigem header `X-API-Key` igual (comparação com `secrets.compare_digest`);
  senão 401. Sem a variável, ficam abertas (modo desenvolvimento) e o app registra um aviso no log
  ao iniciar. Ocorrências e fotos são do cidadão e ficam abertas.
- CORS: origens de `LUZVIVA_CORS` (lista separada por vírgula); default nenhuma.
- Nenhum nome, e-mail ou telefone de cidadão em rota pública, log ou arquivo do dia.

## Regras do RPA (o robô consome a API acima)

- Corte: `prioridade >= 30` **e** sem chamado `aberto`/`em_atendimento` para a placa → abre chamado.
- Prazo de reparo: 5 dias para `apagada`, 10 dias para `insuficiente` (contados de `aberto_em`).
- `aberto` há 1 dia ou mais → `em_atendimento`.
- Prazo vencido → escala (log WARNING + arquivo de escalonamentos do RPA), sem mudar o contrato.
- Conclui quando `/api/luminarias` mostra `situacao == "ok"` com `ultima_medicao > aberto_em`.
- Equipe por área: `SE → EQUIPE-CENTRO`, `PINHEIROS → EQUIPE-OESTE`, `CAMPO LIMPO → EQUIPE-SUL`.

## Variáveis de ambiente

| Variável | Quem usa | Default |
|---|---|---|
| `LUZVIVA_DATA` | app | `data` |
| `LUZVIVA_DIA` | app | `dados_dia` |
| `LUZVIVA_DB` | app | `dados_dia/luzviva.db` |
| `LUZVIVA_FOTOS` | app | `fotos` |
| `LUZVIVA_API_TOKEN` | app e RPA | vazio (aberto) |
| `LUZVIVA_CORS` | app | vazio |
| `IA_URL` | app | vazio (assistente indisponível) |
| `VISAO_URL` | app | vazio (sem visão) |
| `LUZVIVA_API_URL` | RPA e demais | obrigatório no RPA |
