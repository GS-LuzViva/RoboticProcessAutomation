# Três roteiros para a versão 2

Todos: vertical 1080 × 1920, 30 fps, 35 a 45 s, narração em português, o mascote e as telas reais
do app e do robô. Base: [REFERENCIAS_MOTION.md](REFERENCIAS_MOTION.md).

## A (recomendado): "Uma placa, do escuro ao conserto"

**Recurso:** um objeto real atravessa o filme, a placa IP0537885 da Rua da Glória, carregada pelo
mascote. **Forma:** cadeia de objeto a objeto: cada plano termina na coisa que abre o próximo.

O espectador acompanha um poste de verdade, do momento em que apaga até a luz voltar, e vê o site e
o robô como etapas do mesmo caso. Recomendo porque um explicativo funciona melhor com um exemplo
concreto trabalhado do começo ao fim, e ele usa as nossas telas reais como prova.

- **Primeiros 2 s:** mapa noturno real de São Paulo, a câmera mergulha da cidade até a Rua da
  Glória; um único ponto vermelho. Voz: "Esse poste apagou ontem à noite. Ninguém avisou."
- **Batidas:** mergulho no mapa → o ponto vermelho vira a placa amarela (o objeto vira o mundo) →
  a placa vira o popup do app, celular em 85% da largura, punch-in em "Apagada, 0,1 lux" →
  o mascote, apagado, ouve o relato do cidadão: a placa é digitada ao vivo no formulário →
  a linha da fila sobe de prioridade (contador 60 → 90) → whip pan para o terminal do robô,
  linhas reais digitadas, a linha vira o card do chamado (container transform) → prazo correndo →
  "Concluído": a rua escura inunda de luz quente e o mascote acende (clímax, uma vez) →
  encerramento com a marca trazida para o quadro e a equipe.
- **Visual:** três mundos com a mesma tipografia: a cidade à noite (mapa real, tiles escuros
  CARTO com crédito), o app no fundo claro dele (#F5F7FA), o terminal do robô; o amarelo da placa
  é o único acento. Uma família de easing, vetores casados em todo corte.
- **Som:** trilha calma e tensa no escuro, que se abre no clímax; whoosh nos dois cortes grandes,
  tiques no terminal, um pop quando o selo "Concluído" pousa.

## B: "O mascote apagado"

**Recurso:** antes e depois, contado pelo próprio mascote. **Forma:** tela dividida que vira uma só.

O mascote começa apagado (lâmpada escura) no lado "hoje": o relato do cidadão some numa fila, os
dias passam num contador de noites no escuro. No lado "com o LuzViva", o robô de medição e o RPA
agem sozinhos e o mascote acende. É o mais emocional e o mais fácil de lembrar, mas mostra menos
das telas reais.

- **Primeiros 2 s:** o mascote apagado, num quadro escuro, só a placa dele iluminada por um
  celular. Voz: "Eu apaguei há 12 dias."
- **Batidas:** o mascote apagado → tela dividida: à esquerda o caminho de hoje (relato, espera,
  contador de noites), à direita o LuzViva (medição, fila, chamado do robô) → o lado esquerdo
  trava, o direito ganha o quadro inteiro → o mascote acende → encerramento.
- **Visual:** quadro escuro e frio de um lado, claro do outro; a luz do mascote é a transição.
- **Som:** o lado de hoje quase em silêncio, a trilha entra quando o LuzViva aparece.

## C (ousado): "Tipografia na batida"

**Recurso:** a tipografia carrega o argumento. **Forma:** cortes na batida da música.

Frases enormes que cortam no ritmo ("662.945 postes", "nenhum diz qual apagou", "o robô abre o
chamado"), intercaladas com recortes das telas reais em close. O mascote aparece só no gancho e no
fim. É o mais "de lançamento", mas depende de uma boa música e explica menos, o que pesa numa
avaliação.

- **Primeiros 2 s:** "662.945" ocupando o quadro, os números contando.
- **Batidas:** número → "nenhum diz qual apagou" → recortes do mapa, da fila e do terminal na
  batida → "o robô abre o chamado" → encerramento.
- **Visual:** campos de cor chapados (amarelo da placa, preto, branco), tipografia condensada.
- **Som:** a música é o relógio; sem narração, ou narração mínima.

## O que cada um precisa

| | A | B | C |
|---|---|---|---|
| Duração | 40 a 45 s | 35 a 40 s | 25 a 30 s |
| Telas reais do app | muitas (mapa, relato, fila, terminal, chamados) | algumas | recortes |
| Mapa real da cidade | sim (gravado uma vez a partir de tiles CARTO, precisa de internet) | não | não |
| Música | importante | importante | indispensável |
