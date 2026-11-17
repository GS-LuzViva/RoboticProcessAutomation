# Briefing: LuzViva explica, episódio 01, versão 2

| Campo | Valor |
|---|---|
| Objetivo | Mostrar, com um caso real do começo ao fim, que o site mostra a falha e o robô de RPA abre e fecha o chamado sozinho |
| Público | Professora e banca da GS FIAP 2026.2 (não será postado nas redes) |
| Formato | Vertical 1080 × 1920, 30 fps, H.264 + AAC, 39,6 s |
| Por que a v2 | A v1 foi avaliada como pouco profissional; o diagnóstico e as referências estão em `REFERENCIAS_MOTION.md` |
| Roteiro escolhido | A, "Uma placa, do escuro ao conserto" (os outros dois em `STORYLINES.md`) |
| Ferramenta | HyperFrames 0.9.61 (HTML + GSAP renderizado em MP4) |
| Dados | Capturas reais do app e log real do robô de um ciclo executado em 17/11/2026; parte dos dados do piloto é simulada pelo pipeline do grupo, como o vídeo avisa no fim |
| Voz | `pt-BR-FranciscaNeural` via edge-tts (o texto do roteiro vai ao serviço da Microsoft; ok para uso acadêmico) |
| Trilha | Gerada localmente com MusicGen (`facebook/musicgen-small`). **Os pesos do modelo têm licença CC-BY-NC 4.0: só uso não comercial.** Serve para o trabalho acadêmico; não use esta trilha em peça comercial |
| Efeitos sonoros | Biblioteca da skill media-use da HyperFrames, licença Pixabay (uso livre) |
| Mapa | Mapa do próprio site (Leaflet + OpenStreetMap), com o crédito "© OpenStreetMap" na tela |
| Fontes | Public Sans e Barlow Condensed (SIL OFL), as mesmas do app |
| Verificação | `hyperframes check` sem erros; revisão independente quadro a quadro (15 notas corrigidas); áudio medido em -16,6 LUFS, voz cerca de 14,6 dB acima da trilha durante a fala (medido, não ouvido) |
| Arquivos | Master `render/ep-001-v2.mp4` (150,7 MB, local); cópia de distribuição `render/luzviva-explica-ep01-v2.mp4` (28,5 MB, SSIM 0,972 contra o master) |
