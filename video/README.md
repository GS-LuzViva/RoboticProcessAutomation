# Vídeo explicativo: LuzViva explica, episódio 01

[`luzviva-explica-ep01.mp4`](luzviva-explica-ep01.mp4): 36 s, vertical 1080 × 1920, 30 fps, H.264 + AAC.

O mascote-lâmpada do LuzViva explica, com telas reais do app, o que fazem o site e o robô de RPA:
o gancho ("Quem avisa a prefeitura quando um poste apaga?"), o mapa com a falha destacada, o relato
pela placa do poste, o robô lendo a fila e abrindo o chamado, o chamado concluído quando a luz volta
e o encerramento com a equipe.

| Arquivo | Conteúdo |
|---|---|
| `luzviva-explica-ep01.mp4` | Vídeo final |
| `roteiro.md` | Tempos, poses, falas e textos na tela |
| `legendas.srt` | Legendas sincronizadas palavra a palavra (também queimadas no vídeo) |
| `storyboard.json` | Fonte da verdade do episódio (falas, textos, poses e layout por cena) |
| `briefing.md` | Objetivo, público, alegações, fontes e licenças |

## Como foi feito

- Animação: [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML animado renderizado em
  MP4), com as 8 poses do mascote fornecidas pelo integrante e telas capturadas do app.
- Voz: voz neural `pt-BR-FranciscaNeural` (edge-tts). Efeitos sonoros: biblioteca da HyperFrames,
  licença Pixabay. Fontes: Public Sans e Barlow Condensed (SIL OFL).
- Verificação: `hyperframes check` sem erros (layout, contraste, áudio), loudness medido em
  -15,5 LUFS.

Parte dos dados mostrados no vídeo é simulada pelo pipeline do grupo, como o próprio vídeo avisa.
