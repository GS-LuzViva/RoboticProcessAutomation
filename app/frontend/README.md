# Site do LuzViva (frontend)

Console de manutenção da iluminação pública (Sé, Pinheiros e Campo Limpo) e formulário de relato do
cidadão. Vite + React 19 + TypeScript estrito + Tailwind CSS v4 + shadcn/ui (base Radix), rotas com
`HashRouter`, dados com TanStack Query. O plano visual é o [DESIGN.md](DESIGN.md): siga-o à risca.

## Como rodar

Requer Node 24 e npm 11.

```bash
# 1. backend (na pasta luzviva-app, com o .venv já criado)
.venv/Scripts/python.exe -m uvicorn app.main:app --port 8077

# 2. site em modo desenvolvimento (outro terminal, nesta pasta)
npm install
npm run dev          # http://localhost:5173 ; /api, /health e /metrics vão para o 127.0.0.1:8077
```

Build de produção:

```bash
npm run build        # tsc -b + vite build; escreve em ../static (o FastAPI serve essa pasta em /)
npm run lint         # oxlint
```

A pasta `../static` é gerada pelo build e fica versionada (quem só tem Python roda o app sem Node).
Nunca edite `../static` à mão: altere `src/` e rode `npm run build`.

## Mapa de pastas

```
src/
  main.tsx                 aplica o tema salvo antes do primeiro render e monta o App
  App.tsx                  provedores (tema, consulta, chave do gestor, tooltip) e rotas (HashRouter)
  index.css                tokens do DESIGN.md (claro e .dark), fontes, escala tipográfica, raios
  pages/                   uma tela por arquivo (Mapa, Fila, Chamados, Painel, Relatar, Assistente)
  components/
    ui/                    componentes shadcn (gerados pelo CLI e ajustados: foco sólido, 44 px no celular)
    layout/                casca do app: AppShell, BarraLateral, PageHeader, navegacao.ts
    luzviva/               componentes do domínio (PlacaChip, SituacaoBadge, LuxMeter...)
    tema/                  ProvedorTema
  hooks/                   use-api (dados), use-area-param, use-chave-gestor, use-tema, use-mobile
  lib/
    api.ts                 pedir(), ErroApi e as rotas da API
    tipos.ts               tipos dos contratos (Luminaria, ItemFila, Chamado...)
    dominio.ts             nomes pt-BR, limiares, prazos, cores do mapa, regex da placa
    formatar.ts            datas, lux, percentuais, prazo de reparo
    consulta.ts            QueryClient e chaves de cache
    tema.ts                leitura e aplicação do tema
```

## Rotas

| Hash | Arquivo | Título (h1 e aba) |
|---|---|---|
| `#/` | `pages/Mapa.tsx` | Mapa das luminárias |
| `#/fila` | `pages/Fila.tsx` | Fila de manutenção |
| `#/chamados` | `pages/Chamados.tsx` | Chamados |
| `#/painel` | `pages/Painel.tsx` | Painel das áreas |
| `#/relatar` | `pages/Relatar.tsx` | Relatar problema no poste |
| `#/assistente` | `pages/Assistente.tsx` | Assistente |

Cada página é carregada sob demanda (`React.lazy`). O título da aba (`Fila de manutenção | LuzViva`) e
o foco no `<main id="conteudo">` a cada troca de tela já são feitos pela casca. Use
`tituloDaRota("/fila")` (de `components/layout/navegacao`) no `PageHeader` para o h1 bater com a aba.

## Componentes compartilhados

Importe de `@/components/luzviva/<Arquivo>` ou `@/components/layout/<Arquivo>`. O `cn` vem de
`@/lib/utils` (o alias `utils` do `components.json`).

### `PageHeader` (layout)

| Prop | Tipo | Observação |
|---|---|---|
| `titulo` | `string` | o único h1 da tela |
| `descricao` | `ReactNode?` | uma ou duas linhas |
| `acoes` | `ReactNode?` | abaixo do título até 1279 px, à direita a partir de 1280 px (`xl`), sem encolher (ex.: `<AreaToggle />`) |
| `className` | `string?` | |

### `Table` (`@/components/ui/table`)

O `Table` do shadcn com o contêiner de rolagem acessível: quando a tabela não cabe, o contêiner entra na
ordem do Tab (as setas rolam) com anel de foco visível.

| Prop | Tipo | Observação |
|---|---|---|
| `rotulo` | `string?` | nome da região de rolagem (`role="region"` + `aria-label`); passe sempre, ex.: `rotulo="Fila de manutenção, Sé"` |
| demais | props de `<table>` | `className` vai para o `<table>` |

### `PlacaChip`

A miniatura da placa ILUME, elemento-assinatura do design. Toda placa da interface usa este componente.
O leitor de tela lê "Placa IP0723371".

| Prop | Tipo | Padrão | Observação |
|---|---|---|---|
| `placa` | `string \| null` | | vazio mostra "sem placa" |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | sm tabelas, md detalhes, lg prévia ao vivo do relato |
| `to` | `string?` | | rota interna: vira `<Link>` |
| `href` | `string?` | | vira `<a>` |
| `completar` | `boolean?` | `false` | completa os algarismos que faltam com traços (prévia enquanto digita) |
| `className` | `string?` | | |

### `SituacaoBadge`, `StatusChamadoBadge`, `AtrasoBadge`

Sempre ícone + texto + cor, nunca só a cor.

| Componente | Props |
|---|---|
| `SituacaoBadge` | `situacao: Situacao`, `size?: "sm" \| "md"`, `className?` |
| `StatusChamadoBadge` | `status: StatusChamado`, `size?: "sm" \| "md"`, `className?` |
| `AtrasoBadge` | `diasAtraso: number` (de `calcularPrazo`), `size?`, `className?`; texto "Atrasado há N dias" |

### `LuxMeter`

Barra em escala log de 0,1 a 40 lux com marcas em 1 lux e 5 lux; `role="meter"` com valor em texto.

| Prop | Tipo | Observação |
|---|---|---|
| `lux` | `number \| null` | null mostra "sem medição" |
| `semValor` | `boolean?` | esconde o texto "0,4 lux" |
| `className` | `string?` | |

### `PrioridadeBar`

`valor: number` (0..100), `className?`. Número tabular + barra curta. Alinhe a célula à direita.

### `AreaToggle` e `useAreaParam`

O seletor de área vive na URL (`#/fila?area=PINHEIROS`). O componente lê e escreve a URL; a página lê
a mesma URL com o hook.

| Prop | Tipo | Observação |
|---|---|---|
| `permitirTodas` | `boolean?` | mostra "Todas" (`?area=TODAS`) |
| `rotulo` | `string?` | nome acessível do grupo, padrão "Área" |
| `className` | `string?` | |

```ts
const [area, definirArea] = useAreaParam()                          // Area, padrão "SE"
const [area, definirArea] = useAreaParam({ permitirTodas: true })   // Area | null (null = todas)
```

O menu lateral leva o `?area=` junto entre Mapa, Fila e Chamados.

### `EstadoErro`, `EstadoVazio` e esqueletos

| Componente | Props |
|---|---|
| `EstadoErro` | `erro?: unknown` (ex.: `query.error`), `mensagem?`, `titulo?`, `aoTentarDeNovo?: () => unknown` (ex.: `query.refetch`), `tentando?: boolean` (ex.: `query.isRefetching`), `className?` |
| `EstadoVazio` | `titulo: string`, `descricao?: ReactNode`, `icone?: LucideIcon`, `acao?: ReactNode`, `className?` |
| `EsqueletoTabela` | `linhas?` (8), `colunas?` (6), `rotulo?`, `className?` |
| `EsqueletoPainel` | `linhas?` (3), `rotulo?`, `className?` |
| `EsqueletoBloco` | `rotulo?`, `className?` (dê a altura pelo `className`) |

### `GestorKeyProvider` e `useChaveGestor`

Já envolve o app. `const { chave, definirChave } = useChaveGestor()`. A chave fica só em memória (nunca
em localStorage, cookie ou URL) e `useAtualizarChamado` a manda como `X-API-Key`. Num 401, peça a chave
num `Dialog` e chame `definirChave`.

### `useTema`

`const { preferencia, tema, definirPreferencia } = useTema()`; preferência `"claro" | "escuro" | "sistema"`,
tema efetivo `"claro" | "escuro"`. O seletor já está no rodapé da barra lateral.

## Dados (`@/hooks/use-api`)

| Hook | Rota | Retorno (`data`) |
|---|---|---|
| `useLuminarias(area: Area \| null)` | `GET /api/luminarias?subprefeitura=` | `Envelope<Luminaria>` |
| `useFila(area?: Area \| null)` | `GET /api/fila?subprefeitura=` | `Envelope<ItemFila>` (prioridade desc) |
| `usePainel()` | `GET /api/painel` | `Envelope<PainelArea>` |
| `useChamados(statusList?, { area?, placa? })` | `GET /api/chamados?status=a,b` | `ListaChamados` |
| `useAtualizarChamado()` | `PATCH /api/chamados/{id}` | mutação `{ id, alteracao }` → `Chamado`; invalida chamados e fila |
| `useEnviarRelato()` | `POST /api/fotos` (multipart, 30 s) | mutação `NovoRelato` → `Ocorrencia` |
| `usePerguntar()` | `POST /api/assistente` (30 s) | mutação `Pergunta` → `RespostaAssistente`; nunca falha |

Padrões: `retry` 1 (sem repetir 4xx e 503), `staleTime` 60 s nas views e 10 s nos chamados,
`refetchOnWindowFocus` desligado. O `error` é sempre `ErroApi` (`status`, `tipo`, `detalhe`, `corpo`) com
`message` pronta em pt-BR: 401 chave do gestor, 409 conflito, 413 foto grande, 415 formato, 422 com o
detalhe do FastAPI, 503 view não publicada, tempo esgotado e sem conexão. Para tela, use
`mensagemDeErro(erro)` ou passe o erro para `EstadoErro`.

Fora dos hooks, `api.*` (em `lib/api.ts`) tem as mesmas chamadas e `pedir<T>(caminho, opcoes)` é o fetch
com tempo limite (15 s padrão).

Peculiaridades dos dados que valem para todas as telas:

- Na fila, `confianca_visao: 0` significa "sem foto" (o pipeline usa 0, não `null`, quando não há
  relato com visão); mostre "sem foto" e não "0%".
- A mesma placa pode ter até 3 luminárias (postes com mais de um braço): o mapa agrupa por poste,
  as contagens continuam por luminária, iguais às do painel.

## Formatação (`@/lib/formatar`) e domínio (`@/lib/dominio`)

- `formatarDataHora("2026-11-09T19:24:10")` → `09/11/2026 19:24`; `formatarData` → `09/11/2026`.
  Datas da API são horário de São Paulo sem fuso e não são convertidas pelo fuso do navegador.
- `formatarLux(0.4)` → `0,4 lux` (null → `sem medição`); `formatarPercentual(11.9)` → `11,9%` (escala
  0..100); `formatarConfianca(0.95)` → `95%` (escala 0..1); `formatarHoras(93.5)` → `93,5 h`;
  `formatarNumero(17035, 0)` → `17.035`.
- `nomeArea("CAMPO LIMPO")` → `Campo Limpo`; `nomeSituacao`, `nomeStatus`; `VAZIO` para valor ausente.
- `calcularPrazo(chamado)` → `{ prazo, atrasado, diasAtraso, diasRestantes }` (5 dias apagada,
  10 insuficiente, contados de `aberto_em`, no horário de São Paulo); `textoAtraso(dias)`.
- `dominio.ts`: `AREAS`, `NOMES_AREA`, `NOMES_SITUACAO`, `NOMES_STATUS`, `TRANSICOES_STATUS`,
  `CATEGORIAS_RELATO`, `NOMES_CATEGORIA`, `PRAZO_DIAS`, `EQUIPES`, `REGEX_PLACA`, `normalizarPlaca`,
  `placaValida`, `CORES_MAPA` e `BORDA_MAPA` (para o `pathOptions` do Leaflet).

## Tokens e classes

Use token, nunca hex no componente.

- Base shadcn: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`,
  `bg-primary`, `text-primary`, `ring-ring`, `bg-sidebar`...
- Situação: `text-ok` / `bg-ok-fundo` / `bg-ok-mapa`, idem `insuficiente`, `apagada`, `sem-medicao`.
- Placa: `bg-placa`, `text-placa-foreground`, `border-placa-borda` (só na placa e na marca).
- Raio: `rounded-placa` (3 px), `rounded-md`/`rounded-lg`/`rounded-controle` (6 px),
  `rounded-xl`/`rounded-painel` (10 px).
- Fonte: `font-sans` (Public Sans) em tudo; `font-placa` (Barlow Condensed, algarismos tabulares) só na
  placa e nos números grandes do Painel.
- Escala de texto (razão 1,25): `text-xs` 13, `text-sm` 14, `text-base` 16, `text-lg` 20, `text-xl` 25,
  `text-2xl` 31 px. `font-medium` vale 600 (só há os pesos 400, 600 e 700).
- Botões, campos, seletores e abas já têm 44 px de altura abaixo de 768 px.

## Regras para quem constrói as páginas

1. Edite só o seu arquivo em `src/pages/` (e crie o que precisar em `src/pages/<nome>/`). Não mexa em
   `package.json`, `components/ui`, `components/layout`, `components/luzviva`, `hooks` ou `lib`; se faltar
   algo compartilhado, avise.
2. Dados só pelos hooks de `@/hooks/use-api`. Nada de `fetch` direto.
3. Proibido `dangerouslySetInnerHTML` (o lint acusa) e `any`.
4. Cor por token (lista acima), nunca hex. No Leaflet use `CORES_MAPA` e `BORDA_MAPA`; importe
   `leaflet/dist/leaflet.css` dentro da página do mapa.
5. Texto do DESIGN.md: pt-BR, inicial maiúscula só no começo, botão com verbo e objeto ("Enviar relato",
   "Atualizar status", "Ver no mapa"), a mesma ação com o mesmo nome no fluxo inteiro ("Enviar relato" →
   aviso "Relato enviado"), erro diz o que houve e o que fazer sem pedir desculpas, tela vazia convida a
   agir, sem seta em botão ou link, sem rótulo em maiúsculas espaçadas, sem sobretítulo.
6. Situação nunca só por cor: use `SituacaoBadge`. Placa sempre com `PlacaChip`.
7. Tabelas: números à direita e tabulares (`tabular-nums`); tabela larga rola dentro do próprio contêiner
   com a primeira coluna fixa; nenhuma rolagem horizontal da página.
8. Sombra só em elemento flutuante (popover, sheet, dialog). Painéis usam borda (`border bg-card rounded-xl`).
9. Avisos com `toast()` de `sonner` (o `<Toaster>` já está montado).
10. Movimento só em resposta a ação; `prefers-reduced-motion` já desliga transições no CSS global.
