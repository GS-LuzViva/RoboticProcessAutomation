# Referências de motion para a versão 2 do vídeo do LuzViva

Pesquisa de 17/11/2026. Junta três fontes: as referências de revisão, roteiro e especificação da
skill HyperFrames (v0.9.61), os filmes de lançamento open source da HeyGen
([hyperframes-launches](https://github.com/heygen-com/hyperframes-launches)) e guias públicos de
motion design e de vídeo vertical. Cada item diz de onde vem.

## 1. Diagnóstico da versão 1: por que parece amadora

Lida pelo roteiro de revisão da HyperFrames (`references/review.md`): P0 quebra a leitura, P1
enfraquece o filme, P2 é acabamento.

| Prioridade | O que acontece na v1 | Regra que quebra |
|---|---|---|
| P0 | Fundo azul-marinho escuro com mascote e celular pequenos flutuando no meio; os 600 px de baixo ficam vazios | "BANNED by default": void escuro com elementos pequenos no meio (`spec.md`) |
| P0 | É uma lista de funcionalidades (mapa, relato, robô), não uma história: nenhum objeto real atravessa o filme | Um exemplo concreto do começo ao fim (`story.md` §1, `types/explainer.md`) |
| P0 | Telas do app pequenas (celular com 43% da largura), texto ilegível no celular de quem assiste | O herói ocupa pelo menos 40% do quadro (`spec.md`); punch-in no detalhe (Hera, School of Motion) |
| P1 | Toda cena entra igual: placa amarela de título + mascote saltando + legenda | "Toda cena entrando do mesmo jeito" é um vício de vídeo gerado (`story.md` §8) |
| P1 | Única transição é desfoque e troca; cada cena começa parada | Vetores casados em cada corte (template `heygen-apple-motion`) |
| P1 | Brilho atrás do mascote pulsando o tempo todo | Glow e bloom decorativos são proibidos; nada se mexe "para preencher tempo" |
| P1 | Sem trilha | Filme acima de 15 s pede trilha e sons nas ações visíveis (`sound.md`; guia de criativos do TikTok) |
| P1 | Easings misturados (`back.out`, `expo.out`, `power2`) | Uma família de easing para tudo (template `heygen-apple-motion`) |
| P2 | O título na tela repete o que a voz diz | A tela nunca repete a frase falada palavra por palavra (`story.md` §6) |
| P2 | Legenda karaokê amarela, o estilo mais genérico | Legenda em até 2 linhas, revelada por linha, cor só na palavra-chave (guia da Netflix PT-BR) |

## 2. O que deixa um filme com cara de caro

### Uma família de easing

Tudo que chega usa a mesma curva, e tudo que sai usa a espelhada. Nada passa do ponto, nada é
linear, nada usa o `elastic` pronto.

```js
const EO = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));   // chegar: decai com ~0,13 s
const EI = (p) => (p <= 0 ? 0 : Math.pow(2, 10 * (p - 1)));  // sair: acelera para fora
```

Fonte: [heygen-apple-motion/01-ui-sting](https://github.com/heygen-com/hyperframes-launches/tree/main/heygen-apple-motion).
Ali o autor avisa que o `expo.out` do GSAP é outro polinômio e desloca as saídas de 5 a 14 px.
Alternativas equivalentes, de guias oficiais: Material 3 emphasized decelerate
`cubic-bezier(0.05, 0.7, 0.1, 1)` na entrada e emphasized accelerate `cubic-bezier(0.3, 0, 0.8, 0.15)`
na saída ([Material Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md));
IBM Carbon expressive `cubic-bezier(0.4, 0.14, 0.3, 1)` ([Carbon Motion](https://carbondesignsystem.com/elements/motion/overview/)).

### Vetores casados em cada corte

Nenhuma cena para antes do corte, e nenhuma começa parada depois dele. O que sai ainda está em
movimento; o que entra já chega em voo, **no mesmo eixo, no mesmo sentido, numa velocidade
parecida**. É o que transforma uma pilha de cenas num único movimento de câmera. Os templates da
HeyGen guardam isso num `ledger.json`: uma linha por corte com o eixo e o sentido de cada lado.
Se uma cena muda de tempo, os vizinhos mudam junto.

### Desfoque derivado e nenhum movimento ocioso

- O desfoque de um movimento rápido sobe com a mesma curva do movimento e tem o pico no quadro
  mais rápido: 6 a 12 px em elementos do tamanho de texto, 15 a 20 px em tela cheia, só no eixo
  do movimento (`motion.md`; SVG `feGaussianBlur` com `stdDeviation="0 2.1"` para borrar só na
  vertical, como o contador do template 01).
- Nada flutua, respira ou pulsa para preencher tempo. Pausado em qualquer quadro, algo está em voo.
  A exceção é o personagem: a respiração do mascote é atuação, não enfeite (`types/character.md`).
- Irregular de propósito: a digitação não tem ritmo perfeito e as linhas de uma lista não têm o
  mesmo espaçamento. Regularidade perfeita parece máquina.

### Ritmo e números

| Item | Valor | Fonte |
|---|---|---|
| Movimento rápido | 0,3 a 0,6 s | `motion.md` |
| Saída | 40 a 50% mais curta que a entrada | `motion.md` |
| Sobreposição | o próximo começa quando o anterior está 30 a 50% feito | `motion.md` |
| Escalonamento | letras a 1 quadro, palavras a 60 a 120 ms, itens de lista a 40 a 80 ms | `motion.md` |
| Plano médio | 1,8 a 3 s com movimento dentro; algo novo a cada 2 a 4 s | `motion.md`, `spec.md` |
| Leitura | 0,5 s + 0,3 s por palavra; a última linha pelo menos 2 s | `story.md` §6 |
| Herói do plano | pelo menos 40% da altura ou da largura | `spec.md` |
| Um movimento principal por plano | os secundários percorrem 50 a 70% e começam 100 a 200 ms depois | `spec.md` |
| Punch-in no detalhe da tela | 8 a 12% em 6 a 10 quadros, no momento do toque | [Pippit](https://www.pippit.ai/blog/capcut-alternative/capcut-zoom-in-effect) (fonte secundária) |
| Push lento em plano calmo | 1,0 a 1,08 | `film.md` |
| Molas | amortecimento 0,7 a 0,85 parece premium; 0,4 a 0,6 brincalhão; só em posição e escala | `motion.md`; Apple WWDC23 [Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/) |

## 3. Transições com motivo

Use de 3 a 5 tipos no filme, cada um causado por algo na tela; no máximo um terço das emendas são
cortes secos (`motion.md`; School of Motion,
[Six essential transitions](https://www.schoolofmotion.com/tutorials/six-essential-motion-design-transitions-tutorial)).
Sem motivo (tempo, lugar, ênfase), o corte seco é a melhor escolha.

| Transição | Como se constrói | Quando usar no LuzViva |
|---|---|---|
| O objeto vira o mundo | um card cresce além do quadro em 0,65 s, o raio dos cantos diminui, o entorno desfoca ~15 px | o ponto vermelho do mapa vira a placa, que vira o popup do app |
| Container transform | um container se transforma no destino, tamanho e forma juntos ([Material](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)) | a linha da fila vira o card do chamado |
| Match cut | uma forma fica enquanto tudo em volta muda; corte no quadro mais rápido ([School of Motion](https://www.schoolofmotion.com/tutorials/match-cuts)) | a placa amarela pintada no poste casa com a placa da interface |
| Whip pan | borrão horizontal de 0,13 a 0,3 s; os dois lados na mesma velocidade e direção ([No Film School](https://nofilmschool.com/how-to-do-a-whip-pan)) | do site para o terminal do robô |
| Inundação de cor | o objeto herói fica, o fundo muda de cor em ~0,4 s `power2.inOut` | a luz volta: a rua escura vira luz quente |
| Zoom através | a câmera vai até o alvo com desfoque (0,6 s) e o alvo cresce de ~8% a ~250% em 0,35 s | mergulho do mapa da cidade até o poste |

Peças prontas no catálogo da HyperFrames (`npx hyperframes catalog`): `ui-focus-zoom` (zoom e
panorâmica até uma região de uma tela real), `parallax-device-dive` (o celular sobe e a câmera
atravessa a tela), `cursor-zoom-follow`, `pull-back-reveal`, `cut-the-curve` (corte com velocidade
casada), `match-cut`, `whip-pan`, `iris-reveal`, `fade-through`.

## 4. Vertical para Reels e TikTok

- **Gancho:** a proposta nos primeiros 3 s, e o quadro 0 é a miniatura: nunca preto, nunca só um
  logo ([TikTok, Creative best practices](https://ads.tiktok.com/help/article/creative-best-practices)).
- **Área segura (Meta, Reels):** livre 14% em cima, 35% embaixo e 6% nas laterais. Em 1080 × 1920,
  texto entre y 269 e y 1248 e entre x 65 e x 1015
  ([Meta Ads Guide](https://www.facebook.com/business/ads-guide/update/video/instagram-reels)).
  A faixa de baixo recebe chão, sombra e cenário, nunca texto.
- **Legendas:** no máximo 2 linhas de 42 caracteres, reveladas por linha com máscara, cor só na
  palavra-chave ([Netflix, guia PT-BR](https://backlothelp.netflix.com/hc/en-us/articles/215600497-Portuguese-Brazil-Timed-Text-Style-Guide)).
  Estilos prontos mais sóbrios no catálogo: `caption-weight-shift`, `caption-editorial-emphasis`,
  `caption-clip-wipe`.
- **Som:** trilha baixa sob a voz (~0,14 de volume), whoosh com peso proporcional ao tamanho do
  objeto ([Krotos](https://www.krotosaudio.com/sound-effects-motion-graphics-tips/)), tique de
  tecla quando texto é digitado, pop quando um selo pousa, um riser só uma vez, no clímax.
  Mixagem em -16 a -14 LUFS (`sound.md`).

## 5. O mascote sem rig

O mascote são 8 poses estáticas. A vida vem dos 12 princípios da animação
([Disney, via Wikipedia](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation);
[Jake in Motion](https://jakeinmotion.com/animation-principles-for-motion-designers);
[School of Motion, squash and stretch](https://www.schoolofmotion.com/tutorials/squash-stretch-after-effects)):

- `transform-origin` no ponto de contato com o chão; antecipação com squash (scaleX 1,08, scaleY
  0,93) antes de pular, stretch no ar, pouso com leve overshoot.
- Troca de pose escondida no quadro de maior movimento (corte na ação), nunca parado.
- Inclinar na direção do alvo antes de ir até ele; sombra de contato que encolhe e clareia quando
  ele sobe.
- O mascote carrega coisas: segura a placa, empurra o card. "Um personagem dá causa a cada corte"
  (`types/character.md`).
- A lâmpada apagada (escura e dessaturada) e acesa é o próprio argumento do produto: usar no gancho
  e no clímax, não como brilho decorativo.

## 6. Proibido na versão 2

Fundo escuro vazio com elementos pequenos no meio; brilho, bloom e partículas decorativas;
tudo centralizado; tudo entrando com fade e subida; placa de título em toda cena; texto se mexendo
enquanto é lido; três cards em fila; logo encaixado num canto; a mesma entrada cena após cena;
easings misturados; filme sem trilha; a tela repetindo a frase falada.
