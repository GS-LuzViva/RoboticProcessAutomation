# Roteiro do relatório em PDF (ordem pedida pelos professores)

Cada print com legenda numerada ("Figura N: ..."). Um integrante envia no Teams até 19/11/2026, 23h55.

| # | Seção | Conteúdo | Fonte no repositório |
|---|---|---|---|
| 1 | Capa: nomes e RMs | LuzViva RPA; Caíque Walter Silva RM550693, Matheus José de Lima Costa RM551157, João Paulo Fonseca Zamperlini RM99279, Guilherme Monteiro Espim RM99499, Guilherme Nobre Bernardo RM98604; disciplina e professores | README (Integrantes) |
| 2 | CitizenTech e problema | Rua escura até alguém reclamar; 662.945 pontos de luz sem dado aberto de quais estão apagados; 87% dos pedidos de fiação solta no SP156 de abril a setembro de 2026 seguiam em aberto | Ficha Técnica |
| 3 | Objetivo e benefício ao cidadão | Falha vira chamado em até 1 hora, prazo vencido vira alerta, encerramento só com medição | PDD seção 1 |
| 4 | Processo e desenho do fluxo | AS-IS manual x TO-BE; figura do BPMN (exportar PNG/SVG do bpmn.io); entradas, etapas, decisões, repetições, saídas | `docs/processo.bpmn`, `docs/bpmn.md`, PDD seções 2 e 3 |
| 5 | Tecnologias e justificativa | Python + `requests` (integração por API REST, sem tela para "clicar"), `logging`/`pathlib` (padrão da aula), `zoneinfo`/`tzdata` (horário de São Paulo no Windows), agendador do SO (sem servidor extra), pytest + `responses` (testes sem rede) | README (Arquitetura) |
| 6 | Regras de negócio | Tabela de regras: corte 30, um chamado por placa, equipes por área, 1 dia para em atendimento, prazos 5/10 dias, conclusão por medição | PDD seção 4 |
| 7 | Exceções e recuperação | Tabela de exceções; print de `logs/exemplo_falha_api.log` | PDD seção 5 |
| 8 | Logs e auditoria | Formato do log, níveis, JSON de resumo e de escalonamentos; prints | PDD seção 6, `logs/`, `assets/` |
| 9 | Evidências da integração com o MVP | Print do log com chamados abertos, print do site mostrando os mesmos chamados, print de `GET /api/chamados`; explicar que o destino é a API do app, não o SP156 | PDD seção 8, `logs/exemplo_execucao_sucesso.log` |
| 10 | Testes | Tabela dos cenários sucesso, decisão e falha; print de `pytest -q` | `tests/`, `tests/evidencias/pytest_saida.txt` |
| 11 | Segurança e LGPD | Minimização, placa inválida mascarada, filtro de e-mail, token por variável de ambiente, sem corpo de resposta no log | PDD seção 7 |
| 12 | Links | Repositório público (testar em janela anônima) e vídeo no YouTube (não listado) | README (Links) |

Anexo opcional: ROI (economia de 144,8 h/mês, payback de 1,5 mês, 0,85 FTE), de `docs/roi.md`.
