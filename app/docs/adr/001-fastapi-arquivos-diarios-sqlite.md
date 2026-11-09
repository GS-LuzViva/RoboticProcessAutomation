# ADR-001: FastAPI com arquivos do dia em JSON e chamados em SQLite

Status: aceita

Data: 2026-11-09

## Contexto

O app é o único componente na nuvem e o centro da integração: robô, visão, RPA, IA e pipeline
falam com ele por REST. O pipeline de dados espera "um arquivo JSON por dia" por fonte, no envelope
`{"_coleta", "dados"}`. O time é pequeno, o prazo é 19/11/2026 e a carga é baixa (três áreas-piloto,
um robô, poucos relatos por noite). Chamados precisam de estado atual consultável (um aberto por
placa, transições de status), o que um arquivo por dia não dá bem.

## Decisão

- Monólito FastAPI (API + site estático no mesmo processo), validação com Pydantic.
- Medições e ocorrências gravadas direto no arquivo do dia (`dados_dia/<fonte>/<fonte>_AAAA-MM-DD.json`),
  com escrita atômica (arquivo temporário + `replace`) sob um `threading.Lock`.
- Chamados em SQLite (biblioteca padrão) como estado atual; a cada POST/PATCH o chamado também é
  gravado (upsert) no arquivo do dia de `chamados_rpa`, que é o que o pipeline baixa.
- Views do pipeline lidas de `data/` a cada requisição (arquivos pequenos, sem cache).

## Alternativas

- **PostgreSQL ou banco gerenciado**: mais robusto, mas exige serviço extra, credencial e custo
  para um volume que cabe em arquivo. Descartado para o MVP.
- **Tudo em arquivo do dia, inclusive chamados**: achar o chamado aberto de uma placa exigiria ler
  vários dias. Descartado.
- **Tudo em SQLite e exportar o JSON sob demanda**: possível, mas o arquivo do dia já é o formato
  do contrato e serve de trilha de auditoria legível. Descartado por simplicidade.

## Consequências

- Uma única instância do app (a trava é por processo e o SQLite é local). Escalar horizontalmente
  exigiria trocar o armazenamento; não é necessário no piloto.
- `dados_dia/` e `fotos/` precisam de volume persistente no deploy.
- O arquivo do dia é regravado inteiro a cada entrada; aceitável para centenas de registros por dia.
