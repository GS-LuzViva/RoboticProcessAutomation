# Roteiro do vídeo de RPA (até 3 minutos)

Gravação de tela com narração. Publicar no YouTube como não listado e colocar o link no README e no PDF.
Antes de gravar: terminal limpo, fonte grande, `tests/api_simulada.py` (ou o app real) no ar, pasta
`saida/` vazia, site do LuzViva aberto na tela de chamados.

## 0:00 a 0:30 · Problema e papel da automação

- Tela: Ficha Técnica do README, depois o BPMN aberto no bpmn.io.
- Fala: "A cidade só descobre que uma luminária apagou quando alguém reclama. O LuzViva monta uma
  fila de manutenção priorizada com medição do robô e foto do cidadão. O robô de RPA faz o trabalho
  que hoje é manual: abre um chamado por poste, cobra o prazo da equipe e só encerra quando a medição
  confirma o reparo. Ele roda de hora em hora e fala com a API do nosso app, não com o SP156 real."
- Mostrar no BPMN: timer de 1 hora, as duas repetições (subprocessos multi-instância) e os eventos de erro.

## 0:30 a 1:40 · Execução ponta a ponta

- Tela: terminal.
  1. `set LUZVIVA_API_URL=...` e `python -m luzviva_rpa`.
  2. Apontar no log, linha a linha: fila lida (8 itens), item inválido (prioridade 150), chamados
     abertos com equipe por área, duplicado, monitorar, escalonamento, conclusão, resumo com a duração.
  3. Abrir `saida/execucao_*.json` (contagens e `duracao_s`) e `saida/escalonamentos_*.json`.
  4. Rodar de novo: "a segunda execução não abre nada, tudo vira duplicado: o robô é idempotente".
- Tela: site do LuzViva, tela de chamados/fila, mostrando os chamados que o robô acabou de criar.
  "Esse é o resultado consumido pelo MVP; a API também grava o arquivo do dia que volta para o
  pipeline de dados e alimenta o tempo até o reparo no painel."

## 1:40 a 2:20 · Regra de decisão

- Tela: `src/luzviva_rpa/regras.py`, função `decidir_item` e `decidir_chamado`.
- Fala: "Prioridade 30 ou mais e sem chamado aberto para a placa: abre. Abaixo de 30: monitorar.
  Chamado aberto há um dia: em atendimento. Passou de 5 dias para apagada ou 10 para insuficiente:
  escala para o gestor. Conclui só quando o robô de medição viu a luz normal depois da abertura."
- Mostrar `pytest -q` passando e citar os três cenários: sucesso, decisão e falha.

## 2:20 a 3:00 · Falha e segurança

- Tela: terminal com `set LUZVIVA_API_URL=http://127.0.0.1:9` e `python -m luzviva_rpa --simular`.
- Fala: "Com a API fora do ar, o robô tenta 4 vezes com espera crescente, registra o erro, não
  derruba nada, grava o resumo e tenta de novo na próxima hora. Uma falha num item não para os
  outros."
- Mostrar `logs/exemplo_falha_api.log`.
- Fechar: "O log só tem placa, id do chamado, prioridade e contagens; nenhum nome, e-mail ou
  telefone de cidadão. Token só por variável de ambiente. Link do repositório na descrição."
