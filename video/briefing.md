# Briefing do episódio 01: o que fazem o site e o robô de RPA do LuzViva

Adaptação do `BRIEFING_MASCOTE_VIDEO_CLAUDE_CODE.md` (que foi escrito para uma série de cosméticos)
ao projeto LuzViva da GS FIAP 2026.2. O mascote-lâmpada é o mesmo; o assunto é iluminação pública.

| Campo | Valor |
|---|---|
| Série | LuzViva explica (nome editável em `storyboard.json`) |
| Objetivo | Explicar em ~36 s o que o site e o robô de RPA do LuzViva fazem, para avaliação da professora |
| Público | Professora e banca da GS (não será postado nas redes) |
| Pergunta | Quem avisa a prefeitura quando um poste apaga? |
| Mensagem principal | O LuzViva acha a falha antes: o site mostra e recebe relatos, o robô abre e cobra o chamado |
| Formato | Vertical no modelo Reels/TikTok (9:16, 1080 × 1920, 30 fps, MP4 H.264) |
| Duração | 35,9 s |
| Encerramento | Sem CTA: nome do produto, GS FIAP 2026.2, equipe com RM e aviso de dados simulados |
| Produto | App LuzViva (site + API) e robô `luzviva-rpa`, telas reais do build de 09/11/2026 |
| Alegações | Só o que o sistema faz hoje no piloto. "Acha a falha antes" é a proposta do produto, não resultado medido. Rodapé final avisa que é projeto acadêmico com dados do piloto parcialmente simulados |
| Fontes de confirmação | `luzviva-app/docs/especificacao_api.md` (regras do RPA), `luzviva-rpa/logs/rpa_2026-11-09.log` (linhas do terminal), telas capturadas do app |
| Voz | `pt-BR-FranciscaNeural` via edge-tts (escolha do usuário em 09/11; o texto do roteiro vai ao serviço da Microsoft; uso comercial dessa via não é garantido, ok para trabalho acadêmico) |
| Trilha | Sem trilha: não há fonte de música liberada configurada (o catálogo da HeyGen exige login). Efeitos sonoros da biblioteca da skill media-use (licença Pixabay, uso comercial sem atribuição) |
| Status da revisão | Render `render/ep-001.mp4` pronto, aguardando revisão do Caíque antes do envio |

## Assets

| Asset | Origem | Situação |
|---|---|---|
| Mascote, 8 poses | `../../mascote/folha_poses_original.webp` (fornecida pelo usuário), recortada em `../../mascote/poses/` | ok |
| Telas do app | `assets/tela_*.png`, capturadas do build atual a 390 px, densidade 2x | ok |
| Fontes | Public Sans e Barlow Condensed (SIL OFL), as mesmas do app | ok |
| Logo da marca | não existe logo oficial além do selo "LV" do app | usar o selo do app |
| Música | não fornecida | pendente, opcional |
