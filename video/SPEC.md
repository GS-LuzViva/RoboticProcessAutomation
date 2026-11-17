# SPEC: LuzViva explica, episódio 01, versão 2 ("Uma placa, do escuro ao conserto")

Roteiro A de [STORYLINES.md](STORYLINES.md); referências em
[REFERENCIAS_MOTION.md](REFERENCIAS_MOTION.md).

```text
GOAL:    a professora entende, com um caso real, que o site mostra a falha e o robô de RPA abre e
         fecha o chamado sozinho; termina lembrando "a falha encontrada antes da reclamação".
OUTPUT:  HyperFrames 0.9.61, 1080 x 1920, 30 fps, MP4 H.264 + AAC.
TIME:    ~40 s (a narração manda; tempos finais em video/assets/narracao.json).
```

## O objeto que atravessa o filme

A placa **IP0537885** (Rua da Glória, Sé): 3 luminárias, 0,13 lux medido em 12/11, prioridade 60,
chamado `CH-20261117-IP0537885` aberto pelo robô para a EQUIPE-CENTRO. Toda informação na tela
vem das capturas reais em `assets/telas/` e do log real do robô. Único número ilustrativo: a
prioridade 60 → 70 depois de um relato, que é a regra da fila aplicada (+10 por relato).

## LOOK

- **Três mundos, uma tipografia.**
  1. *A cidade à noite:* o mapa real do site no tema escuro (OpenStreetMap), tela cheia, sem
     moldura. Crédito "© OpenStreetMap" em 22 px, canto inferior direito, fundo escuro sólido.
  2. *O app:* fundo claro do produto `#F5F7FA` ocupando o quadro todo; o celular com 860 px de
     largura (80% do quadro), sombra de contato `0 40px 80px rgba(27,36,48,.28)`.
  3. *O robô:* terminal `#0A0F15` em tela cheia, texto IBM Plex Mono 34 px, verde `#CFE3D6`.
- **Tinta:** `#1B2430` no claro, `#E6EBF1` no escuro. **Acento único:** o amarelo da placa
  `#F5C518`, só na placa, na palavra-chave da legenda e no fim.
- **Tipos:** Public Sans 700 para títulos (72 a 96 px, tracking -1%), 600 para legendas (54 px);
  Barlow Condensed 700 só na placa.
- **Profundidade:** uma luz, de cima à esquerda; grão 3% em todo o filme; vinheta 6% só na cidade.
- **Clímax:** "a luz volta": inundação de luz quente `#FFD27A` a 35% sobre a rua, uma vez.

## OBJECTS

- A placa ILUME: retângulo amarelo, borda preta de 6 px, cantos de 6 px, "IP 0537885" em Barlow
  Condensed 700. É a mesma da interface do app e do poste.
- O mascote: as 8 poses, sempre com sombra de contato elíptica (opacidade 0,35, desfoque 18 px)
  no chão. Apagado: `filter: brightness(.45) saturate(.2)`; aceso: normal. A troca de estado é o
  clímax.
- O celular: moldura `#0B0F14`, raio 76 px, tela com raio 60 px, captura real 3x dentro.

## MOTION

- **Família única:** `EO(p) = 1 - 2^(-10p)` para chegar, `EI(p) = 2^(10(p-1))` para sair,
  registradas como `CustomEase`/funções; `power2.inOut` só em câmera e inundação de cor.
  Nada de `back`, `elastic` ou `linear` (exceto contadores carimbados com `tl.set`).
- **Durações:** chegada 0,5 s; saída 0,3 s; câmera 0,8 a 1,2 s; troca de pose 0 s (corte na ação).
- **Desfoque derivado:** pico de 14 px no eixo do movimento em quem cruza mais de 600 px em
  menos de 0,4 s.
- **Mascote:** antecipação scaleX 1,08 / scaleY 0,93 por 0,12 s, pulo 60 px, pouso com scaleY 0,96
  por 0,08 s; respiração 1,000 → 1,012 a cada 2,4 s; sombra de contato encolhe 30% no ar.
- **Nada ocioso:** fora a respiração do mascote, nada pulsa, flutua ou brilha sem causa.

## SHOTS (tempos aproximados; a narração ajusta)

| # | Tempo | Mundo | Movimento principal | O que se lê | Som | Passa para o próximo |
|---|---|---|---|---|---|---|
| 1 | 0,0 a 3,5 | cidade | Mapa da Sé em tela cheia já no quadro 0; push 1,00 → 1,35 em direção à Rua da Glória | "Esse poste apagou." (título 88 px, alinhado à esquerda, y 300) | trilha entra baixa | zoom through: o mapa da área cresce e desfoca, a vista da rua entra em voo, mesmo sentido |
| 2 | 3,5 a 9 | cidade | Vista da rua: o ponto vermelho no centro; a placa amarela nasce do ponto (escala 0 → 1 com EO); o mascote apagado entra pela esquerda segurando a placa | "0,1 lux" grande ao lado do ponto quando a voz diz "lux" | pop na placa | a placa cresce e vira o popup do app (o objeto vira o mundo), fundo vira `#F5F7FA` |
| 3 | 9 a 14 | app | Celular entra subindo, em voo; ui-focus-zoom de 1,0 → 1,4 no popup "Apagada, 0,1 lux" | só a tela real | whoosh grave | pan para a esquerda: o mascote empurra o celular para fora e o formulário entra pela direita, mesmo eixo |
| 4 | 14 a 18,5 | app | Formulário real; a placa digitada ao vivo é a mesma placa amarela; punch-in de 10% na prévia da placa | "foto + placa" | tiques de tecla | a placa da prévia sobe e encaixa na linha da fila (container transform) |
| 5 | 18,5 a 23 | app | Linha da fila real em close; contador de prioridade 60 → 70 carimbado; selo "+1 relato" | prioridade 70 | pop no 70 | whip pan horizontal para o terminal (0,22 s, desfoque 20 px) |
| 6 | 23 a 30 | robô | Terminal em tela cheia; as linhas reais do log com a placa digitadas uma a uma; a linha "chamado aberto" acende e vira o card do chamado | `CH-20261117-IP0537885` · EQUIPE-CENTRO | digitação, um whoosh curto no card | o card voa de volta para a rua escura |
| 7 | 30 a 35 | cidade → luz | Card "Concluído" real; a rua escura inunda de luz quente; o mascote acende (corte na ação: pula apagado, pousa aceso) | "Concluído" | riser curto para o clímax, a trilha abre | o mascote acena e a câmera recua |
| 8 | 35 a ~40 | fim | Marca LuzViva trazida para o quadro pela placa (a placa vira o selo "LV"); equipe com RM; aviso de dados simulados | nomes e RM, 34 px | trilha fecha em 1,5 s | segura 2,5 s |

**Vetores dos cortes (ledger):** 1→2 escala ↑ / escala ↑; 2→3 escala ↑ (a placa cresce) / escala ↓
(o celular assenta); 3→4 para a esquerda / para a esquerda; 4→5 para cima / para cima;
5→6 para a esquerda (whip) / para a esquerda; 6→7 para baixo / para baixo; 7→8 escala ↓ / escala ↓.

## Legendas

Uma frase de até 2 linhas e 42 caracteres, revelada por linha com máscara (`caption-clip-wipe`),
branca com fundo escuro de 60% só atrás do texto, palavra-chave em amarelo. Faixa de y 1120 a
1248 (área segura do Reels). Nunca repete o título da tela.

## BANNED

Fundo escuro vazio com coisas pequenas no meio; brilho ou bloom decorativo; tudo centralizado;
placa de título em toda cena; fade e subida como entrada padrão; texto se mexendo enquanto é lido;
easings misturados; cena que começa ou termina parada num corte; legenda karaokê amarela palavra
a palavra; logo encaixado num canto; a tela repetindo a frase falada.

## QA

| Quadro | Precisa mostrar |
|---|---|
| 0 | o mapa noturno real e o título; nunca preto |
| meio do plano 2 | a placa amarela nascendo do ponto vermelho, o mascote apagado segurando-a |
| meio do plano 3 | o popup real legível a 360 px de largura |
| meio do plano 6 | a linha real do log com IP0537885 |
| pico do plano 7 | a rua clara e o mascote aceso |
| último | a equipe com RM e o aviso, parados há pelo menos 2 s |
