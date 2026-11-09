# Fluxo do robô (BPMN)

O modelo oficial está em [`processo.bpmn`](processo.bpmn) (BPMN 2.0 com coordenadas de diagrama):
abra em https://demo.bpmn.io (File > Open) ou no Camunda Modeler. Abaixo, o mesmo fluxo em Mermaid
para leitura rápida no GitHub.

## Processo principal

```mermaid
flowchart LR
    S(("Início<br/>timer: de hora em hora")) --> LF["Ler fila<br/>GET /api/fila<br/>timeout 20 s, 4 tentativas"]
    LF -- "API fora do ar<br/>(evento de erro de borda)" --> EF["Registrar erro da fila<br/>(ERROR) e pular a fase"]
    LF --> GV{"Envelope<br/>válido?"}
    GV -- "não: JSON inválido,<br/>vazio ou sem lista" --> EF
    GV -- "sim" --> LC["Ler chamados abertos<br/>GET /api/chamados"]
    LC --> SPF[["Para cada item da fila<br/>(repetição)"]]
    SPF --> M1{"junção"}
    EF --> M1
    M1 --> LA["Ler chamados abertos<br/>e luminárias"]
    LA -- "API fora do ar" --> EC["Registrar erro dos chamados<br/>(ERROR) e pular a fase"]
    LA --> SPC[["Para cada chamado aberto<br/>(repetição)"]]
    SPC --> M2{"junção"}
    EC --> M2
    M2 --> R["Gerar resumo<br/>log + execucao_*.json"] --> E(("Fim"))
```

## Subprocesso: cada item da fila (multi-instância sequencial)

```mermaid
flowchart LR
    I(("Item")) --> V["Validar item<br/>placa ^IP\d{7}$, prioridade 0..100,<br/>área-piloto"]
    V --> D{"Decisão<br/>do item"}
    D -- "inválido" --> INV["Registrar inválido<br/>(WARNING)"]
    D -- "prioridade < 30 ou<br/>situação ok" --> MON["Registrar monitorar"]
    D -- "já tem chamado aberto<br/>ou placa repetida na fila" --> DUP["Registrar duplicado"]
    D -- "prioridade >= 30<br/>e sem chamado" --> AB["Abrir chamado<br/>POST /api/chamados"]
    AB -- "409" --> DUP
    AB -- "falha da API<br/>(erro de borda)" --> FA["Contar falha (ERROR)<br/>e seguir"]
    INV --> F(("Item tratado"))
    MON --> F
    DUP --> F
    AB --> F
    FA --> F
```

## Subprocesso: cada chamado aberto ou em atendimento (multi-instância sequencial)

```mermaid
flowchart LR
    C(("Chamado")) --> G1{"Luminária ok com<br/>medição depois<br/>da abertura?"}
    G1 -- "sim" --> CO["Concluir<br/>PATCH status concluido"]
    G1 -- "não" --> G2{"Prazo vencido?<br/>5 d apagada<br/>10 d insuficiente"}
    G2 -- "sim" --> ES["Escalar: log WARNING +<br/>escalonamentos_AAAA-MM-DD.json"]
    G2 -- "não" --> G3
    ES --> G3{"Status aberto há<br/>1 dia ou mais?"}
    G3 -- "sim" --> AT["PATCH em_atendimento"]
    G3 -- "não" --> F(("Chamado tratado"))
    AT --> F
    CO --> F
    CO -- "falha da API" --> FC["Contar falha (ERROR)<br/>e seguir"]
    AT -- "falha da API" --> FC
    FC --> F
```

## Como ler o modelo

| Elemento BPMN | Onde aparece | Significado no robô |
|---|---|---|
| Evento de início de timer (`R/PT1H`) | Início | Agendador do sistema operacional chama `python -m luzviva_rpa` de hora em hora |
| Tarefa de serviço | Ler fila, ler chamados, abrir, PATCH | Chamada HTTP à API do app (`cliente.py`) |
| Evento de erro de borda | Ler fila, ler chamados/luminárias, abrir, PATCH | `ApiIndisponivel` depois de 4 tentativas com espera 2, 4, 8 s, ou erro HTTP |
| Gateway exclusivo | Envelope válido?, Decisão do item, Conclui?, Prazo?, 1 dia? | Funções puras de `regras.py` |
| Subprocesso multi-instância sequencial (marcador de três barras) | Para cada item / para cada chamado | Laços `for` de `execucao.py` sobre as coleções |
| Gateways sem nome | Junções | Os caminhos se reencontram; uma fase que falha não impede a seguinte |

Decisões de desenho:

- A fase de acompanhamento roda mesmo quando a fila falhou: um problema na view da fila não deve
  impedir que chamados antigos sejam concluídos ou escalados.
- Escalonamento é verificado antes do PATCH de `em_atendimento` e não depende dele: se o PATCH falhar,
  o alerta de prazo vencido sai mesmo assim.
- Uma falha num item (POST ou PATCH) conta como `falhas` e o laço segue para o próximo item.
