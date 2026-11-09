# Plano de design do app LuzViva

Fonte: skills frontend-design (Anthropic), web-design-guidelines (Vercel) e taste-skill, aplicadas
a uma **ferramenta**, não a um site institucional. Toda tela segue este documento; mudança aqui
vale para todas.

## Assunto, público e trabalho principal

- **Assunto:** console de manutenção da iluminação pública nas áreas-piloto Sé, Pinheiros e
  Campo Limpo (São Paulo).
- **Público:** o gestor da ILUME ou da concessionária (desktop no escritório, celular em campo) e
  o cidadão que fotografa um poste apagado à noite, em celular de entrada e rede ruim.
- **Trabalho principal:** mostrar o que está escuro e o que consertar primeiro.

## O elemento memorável: a placa ILUME

Todo poste de São Paulo tem a placa pintada (`IP0723371`), e ela é a chave que liga robô, foto,
fila e chamado. Toda placa na interface aparece como uma **miniatura da placa real**: algarismos
condensados em negrito, preto sobre amarelo, borda fina e canto quase reto (componente
`PlacaChip`). No formulário de relato, a placa se desenha ao vivo enquanto o cidadão digita.
É o único lugar onde a interface ousa; o resto fica quieto e disciplinado.

Segundo elemento, que é dado e não enfeite: o **medidor de lux** (`LuxMeter`), uma barra curta
em escala logarítmica de 0,1 a 40 lux com marcas nos limiares reais do projeto, 1 lux (apagada)
e 5 lux (insuficiente).

## Cor

Tema claro é o padrão (gestor trabalha de dia); tema escuro é opção do usuário, seguindo o
sistema na primeira visita.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--background` | `#F5F7FA` | `#111923` | fundo da área de trabalho (cinza frio, não creme) |
| `--card` | `#FFFFFF` | `#18222E` | painéis, tabelas |
| `--foreground` | `#1B2430` | `#E6EBF1` | texto (asfalto à noite, não preto puro) |
| `--muted-foreground` | `#5B6675` | `#9AA6B4` | texto secundário (contraste AA nos dois) |
| `--border` | `#DCE1E8` | `#2A3644` | linhas |
| `--primary` | `#1D4E9E` | `#6E9BEA` | ações, links, foco (azul da sinalização municipal) |
| `--sidebar` | `#1B2430` | `#0D141C` | barra lateral: a "noite" em volta da área de trabalho |
| `--placa` | `#F5C518` | `#F5C518` | **só** a placa e a marca do LuzViva |

Situação da luminária (cores do roteiro: verde ok, amarelo insuficiente, vermelho apagada, cinza
sem medição). **Nunca só a cor:** sempre ícone e texto junto.

| Situação | Texto/ícone | Preenchimento | Ícone lucide |
|---|---|---|---|
| `ok` | `#17734A` | `#DDF3E7` | `Lightbulb` |
| `insuficiente` | `#8A5300` | `#FCEBC7` | `SunDim` |
| `apagada` | `#B42318` | `#FDE3E1` | `LightbulbOff` |
| `sem_medicao` | `#5B6675` | `#E9EDF2` | `CircleHelp` |

No escuro, os preenchimentos ficam em ~15% de opacidade da cor do texto e o texto clareia o
bastante para AA. No mapa, os círculos usam a cor cheia (ok `#22A06B`, insuficiente `#E8A317`,
apagada `#D92D20`, sem medição `#8C96A3`) com borda branca de 1,5 px.

Proibido no design próprio: violeta/lavanda, gradiente decorativo, sombra cinza igual em tudo.

## Tipografia

- **Public Sans** (fonte de interfaces de governo; serviço público é o assunto): toda a UI,
  títulos e texto. Pesos 400, 600 e 700.
- **Barlow Condensed** 600/700, algarismos tabulares: **só** na placa e nos números grandes do
  Painel (lembram a numeração pintada em poste e a sinalização viária).
- Escala (razão 1,25): 13, 14, 16 (base), 20, 25, 31 px. Altura de linha 1,5 no texto, 1,2 nos
  títulos. Linhas de texto com no máximo ~75 caracteres.
- Fontes auto-hospedadas via `@fontsource/*` (nada de CDN), `font-display: swap`.
- Sem rótulo em maiúsculas espaçadas, sem palavra destacada em cor dentro de título, sem
  sobretítulo acima de cada seção, sem fonte monoespaçada para rótulo. A placa é maiúscula
  porque o conteúdo é maiúsculo.

## Forma e espaço

- Raio com hierarquia: placa 3 px; controles (botão, input, badge) 6 px; painéis e tabelas 10 px.
- Espaçamento em múltiplos de 4 px; respiro entre blocos 24 px no desktop, 16 px no celular.
- Bordas finas (`--border`) separam; sombra só em elementos flutuantes (popover, sheet, dialog).
- Alvos de toque com pelo menos 44 px no celular.

## Layout

Desktop (>= 1024 px):

```
┌──────────┬──────────────────────────────────────────────┐
│ ▣ LuzViva│ Mapa das luminárias        [Sé|Pinheiros|CL] │  cabeçalho da página
│          ├──────────────────────────────────────────────┤
│ Mapa     │                                    ┌───────┐ │
│ Fila     │            mapa                    │ lista │ │
│ Chamados │                                    │ falhas│ │
│ Painel   │  [legenda c/ contagens]            │       │ │
│ Relatar  │                                    └───────┘ │
│ Assist.  │                                              │
│ ──────── │                                              │
│ tema     │                                              │
└──────────┴──────────────────────────────────────────────┘
```

Celular (< 768 px): barra superior com o título e o botão de menu (sidebar vira `Sheet`), uma
coluna, botões principais em largura total, nenhuma rolagem horizontal da página (tabelas largas
rolam dentro do próprio contêiner, com a primeira coluna fixa).

Alinhamento: tudo à esquerda, bordas esquerda e direita iguais. Números alinhados à direita e
tabulares nas tabelas.

O seletor de área (`AreaToggle`: Sé, Pinheiros, Campo Limpo) é o mesmo em Mapa, Fila e
Chamados, fica no cabeçalho da página e vive na URL (`?area=SE`), então um link compartilhado
abre na mesma área.

## Telas

- **Mapa** (`#/`): mapa ocupa a área; um marcador e uma linha por **poste** (a mesma placa tem
  até 3 luminárias), contagens por luminária; à direita (desktop) a lista dos postes com falha
  da área, apagada primeiro e depois menor lux (a view do mapa não traz prioridade); clicar centraliza e abre o popup. Legenda com contagem por situação.
  No celular, a lista vira um `Drawer`/`Sheet` inferior "Ver lista".
- **Fila** (`#/fila`): tabela por prioridade (número + barra curta), placa, endereço, situação,
  lux (`LuxMeter`), relatos, confiança da visão, chamado. Linha abre `Sheet` com detalhes e as
  ações "Ver no mapa" e "Perguntar ao assistente".
- **Chamados** (`#/chamados`): abas Em aberto / Concluídos / Cancelados / Todos; prazo (5 dias
  apagada, 10 insuficiente) e badge "Atrasado há N dias"; trocar status por `Select` + botão
  "Atualizar status"; chave do gestor num `Dialog`, guardada só em memória.
- **Painel** (`#/painel`): comparação das três áreas em linhas (não três cards iguais): % com
  falha em número grande (31 px), barra empilhada ok/insuficiente/apagada **só das inspecionadas**
  (o cadastro real tem dezenas de milhares de pontos e uma barra contra ele seria enganosa), a
  linha "X de Y luminárias inspecionadas", mediana de horas até o reparo, chamados em aberto
  (número ao vivo da API de chamados).
- **Relatar problema no poste** (`#/relatar`): formulário pensado para celular: placa com prévia ao vivo, foto com
  miniatura, tipo do problema em `RadioGroup`, área, localização opcional, uma linha de
  privacidade, botão "Enviar relato", estado de sucesso "Relato enviado" com o resultado da visão.
- **Assistente** (`#/assistente`): conversa; resposta com fontes; badge "Não consta na base"
  quando `recusou`; confiança; estado "Assistente indisponível no momento"; sugestões de pergunta
  geradas com placas reais do topo da fila; linha "A decisão final é do gestor".

## Texto

Português do Brasil, frase com inicial maiúscula só no começo, verbo de ação nos botões com o
objeto ("Enviar relato", "Atualizar status", "Ver no mapa"); a mesma ação tem o mesmo nome no
fluxo inteiro (botão "Enviar relato" → aviso "Relato enviado"). Erro diz o que houve e o que
fazer, sem pedir desculpas. Tela vazia convida a agir. Sem seta "→" em botão ou link.

## Movimento

Só o que responde a uma ação (abrir sheet, dialog, popover, confirmar envio) com as transições
padrão do shadcn. Nada entra animado por rolagem. `prefers-reduced-motion` desliga transições.

## Revisão contra os vícios de página gerada (passada 2)

1. Primeira ideia foi tema escuro "noturno" com amarelo de destaque: é o vício "fundo quase preto
   com um acento vivo" e o gestor trabalha de dia. **Trocado** por tema claro com barra lateral
   escura (a noite emoldura o trabalho) e o amarelo restrito à placa.
2. Painel em três cards iguais com número grande seria o "kit SaaS". **Trocado** por linhas de
   comparação, porque o trabalho ali é comparar áreas.
3. Fonte: Inter/Geist seriam o padrão de qualquer projeto. **Escolhida** Public Sans pelo
   assunto (serviço público), Barlow Condensed restrita a placa e números.
4. Sem sobretítulos em maiúsculas, sem "A · B · C", sem monoespaçada, sem seta em botão.
