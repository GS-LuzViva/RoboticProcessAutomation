# ROI do robô de RPA (custo e tempo de execução)

Modelo da planilha de ROI da aula. Os números de entrada estão em [`roi.csv`](roi.csv) (abre no
Excel ou no Google Planilhas) com a coluna `tipo` dizendo o que é **medido**, **estimativa** ou
**calculado**. Troque as estimativas pelos números reais da ILUME/concessionária quando houver.

## Entradas

| Parâmetro | Valor | Tipo | Base |
|---|---|---|---|
| Volume mensal de chamados | 600 | estimativa | cerca de 47.736 pontos de luz na área-piloto, com cerca de 1,3% de falhas novas por mês |
| AHT manual por chamado | 15 min | estimativa | abrir (5 min: conferir duplicado, preencher, escolher equipe) + acompanhar (10 min: marcar atendimento, cobrar prazo, conferir reparo) |
| AHT do robô, medido | 0,146 s por execução | **medido** | `assets/exemplo_execucao_sucesso.json`, campo `duracao_s`: 8 itens da fila e 6 chamados, 3 POST e 2 PATCH contra a API simulada local |
| AHT do robô usado no cálculo | 1 s por chamado | estimativa conservadora | o medido dá cerca de 0,01 s por item; 1 s cobre a latência da API na nuvem (umas 3 chamadas HTTP na vida de um chamado) |
| Supervisão humana | 10% dos chamados x 5 min | estimativa | escalonamentos que o gestor cobra (pessoa no circuito) |
| Custo da hora (FTE) | R$ 45,00 | estimativa | analista administrativo: R$ 4.500 + 70% de encargos = R$ 7.650 / 170 h |
| Custo de setup | R$ 9.000 | estimativa | 100 h de desenvolvimento e testes x R$ 90/h |
| Custo mensal | R$ 370 | estimativa | VM/agendador R$ 100 + 3 h de manutenção x R$ 90 |

Como medir o AHT do robô na operação real: cada execução grava `saida/execucao_*.json` com
`duracao_s` e as contagens. AHT por chamado = soma de `duracao_s` / soma de (`abertos` +
`em_atendimento` + `concluidos`) no mês. A última linha de cada execução no log traz o mesmo número.

## Cálculo

| Saída | Fórmula | Resultado |
|---|---|---|
| Horas manuais por mês | 600 x 15 / 60 | 150,0 h |
| Horas do robô por mês | 600 x 1 / 3600 | 0,17 h |
| Horas de supervisão por mês | 600 x 10% x 5 / 60 | 5,0 h |
| **Economia de horas por mês** | 150 - 0,17 - 5 | **144,8 h** |
| Economia bruta por mês | 144,83 x R$ 45 | R$ 6.517,50 |
| **Economia líquida por mês** | 6.517,50 - 370 | **R$ 6.147,50** |
| **Payback** | 9.000 / 6.147,50 | **1,5 mês** |
| **ROI anual** | (12 x 6.147,50 - 9.000) / 9.000 | **720%** |
| **FTEs recuperados** | 144,83 / 170 | **0,85 FTE** |

## Leitura

- O ganho principal não é só custo: o robô trabalha de hora em hora, inclusive à noite e no fim de
  semana, então a falha vira chamado em até 1 hora (no manual, só no próximo dia útil), e nenhum prazo
  vencido passa sem alerta.
- Mesmo dobrando o AHT do robô ou o custo mensal, o payback continua abaixo de 2 meses. O número que
  mais pesa é o AHT manual: com 8 min em vez de 15, a economia líquida cai para cerca de R$ 3.000/mês
  e o payback sobe para 3 meses.
- As premissas manuais são estimativas do grupo, não medições na Prefeitura; o AHT do robô é medido.
