# Dados simulados

As views em `data/` (`vw_mvp_mapa_luminarias.json`, `vw_mvp_fila_manutencao.json`,
`vw_mvp_painel_subprefeitura.json`) são **simuladas**. O contrato não permite uma chave
`"simulado"` no envelope, então o aviso fica aqui.

## Por quê

O app precisava rodar em 09/11 servindo as três views, antes de o pipeline (Airflow + Databricks,
repositório `GN0Ber/gs-citizentech-dados`) publicar as views reais. Com dados no formato exato do
contrato, o site, o RPA e o assistente podem ser construídos e testados agora, e nada muda quando o
dado real chegar: basta trocar os arquivos em `LUZVIVA_DATA`.

## De onde vêm

Pasta `amostras/`, copiada do repositório de dados:

| Fonte | Real ou simulada | Observação |
|---|---|---|
| `luminarias/` | **real** | recorte do cadastro ILUME (GeoSampa, camada `geoportal:iluminacao_publica`): 600 pontos por área; `_coleta.pontos_por_area` traz o total real de cada área |
| `medicoes_robo/` | simulada | gerada pelo simulador do pipeline sobre luminárias reais |
| `ocorrencias_app/` | simulada | idem; os nomes e e-mails de `cidadao` são fictícios (`@exemplo.com`) e não passam para as views |
| `chamados_rpa/` | simulada | idem |

As amostras simuladas têm erros de propósito (lux negativo, leitura de dia, GPS fora de SP, id
repetido, categoria nula, confiança acima de 1) para exercitar a limpeza.

## Como são geradas

`python scripts/gerar_views_simuladas.py` reproduz em Python puro (só biblioteca padrão) a camada
Prata e o SQL da camada Ouro:

1. **Limpeza (Prata)**: id repetido fica com o último registro (MERGE); descarta medição com lux
   ausente ou negativo, sem lat/lon, fora do município de São Paulo (caixa lat -24,01 a -23,35, lon
   -46,83 a -46,36) ou fora do horário noturno (18h a 6h); descarta ocorrência sem categoria, fora de
   SP ou com `confianca_visao` fora de 0..1. Chamados: último estado de cada `id_chamado`, lendo os
   arquivos em ordem de data.
2. **Ligação com a luminária**: pela `placa` primeiro (todos os pontos com aquela placa, como um
   JOIN; há postes com mais de um ponto); sem placa conhecida, a luminária mais próxima até 30 m
   (haversine). Registro sem ligação fica fora.
3. **Mapa**: uma linha por luminária; `situacao` pela última medição válida (`< 1 lux` apagada,
   `< 5` insuficiente, senão ok; sem medição, `sem_medicao`); `ocorrencias_app` conta as ocorrências
   ligadas.
4. **Fila**: luminárias apagadas ou insuficientes, ou com visão >= 0,8 em `luminaria_apagada` ou
   `luminaria_piscando`. `prioridade = min(100, base + min(30, 10 x ocorrencias_app) + 10 se visão >= 0,8)`,
   base 60 apagada, 30 insuficiente, 0 nos demais casos. `chamado_aberto`/`status_chamado` = chamado
   aberto ou em atendimento mais recente da placa. Ordem: prioridade decrescente, depois `id_luminaria`.
5. **Painel**: por subprefeitura; `luminarias_cadastradas` usa o total real de
   `_coleta.pontos_por_area` (por isso é bem maior que o número de luminárias do mapa);
   `pct_com_falha` é sobre as inspecionadas; `mediana_horas_ate_reparo` usa os chamados concluídos.

O resultado é determinístico: `gerado_em` é o instante do registro mais recente das amostras, não o
relógio. As amostras vão até 12/11/2026, então algumas datas estão "no futuro" em relação a hoje.

## Diferença em relação ao que roda no app

Na API, `chamado_aberto` e `status_chamado` da fila são sobrepostos com o banco de chamados atual.
Os chamados das amostras não estão no banco, então a fila servida começa sem chamados abertos e o RPA
abre os seus. Isso é o comportamento esperado da especificação (o banco é o estado atual).
