# Vídeo explicativo: LuzViva explica, episódio 01 (versão 2)

[`luzviva-explica-ep01.mp4`](luzviva-explica-ep01.mp4): 40 s, vertical 1080 × 1920, 30 fps,
H.264 + AAC, com narração, trilha e legendas.

Um caso real atravessa o filme: o poste **IP0537885**, na Rua da Glória (Sé). O mapa do site mostra
o poste apagado, o robô de medição registra 0,1 lux, um cidadão confirma pela placa, a prioridade
sobe de 60 para 70 na fila, o robô de RPA abre o chamado para a equipe do centro e o fecha quando
a luz volta. Tudo o que aparece do sistema é captura real do app e linha real do log do robô, de um
ciclo executado em 17/11/2026.

| Arquivo | Conteúdo |
|---|---|
| `luzviva-explica-ep01.mp4` | Vídeo final (cópia de distribuição; o master sem compressão extra fica fora do Git) |
| `roteiro.md` | Tempos, mundos, falas e transições plano a plano |
| `SPEC.md` | Especificação de direção: visual, objetos, linguagem de movimento, cortes e o que foi proibido |
| `REFERENCIAS_MOTION.md` | Diagnóstico da versão 1 e as referências de motion, transições e vídeo vertical usadas na versão 2 |
| `STORYLINES.md` | Os três roteiros propostos (o escolhido foi o A) |
| `briefing.md` | Objetivo, público, licenças e verificação |
| `legendas.srt` | Legendas sincronizadas (até 42 caracteres por linha) |
| `storyboard.json` | Falas por plano, usadas para gerar a narração |

## Como foi feito

- Animação em [HyperFrames](https://github.com/heygen-com/hyperframes) 0.9.61: uma família única de
  easing, vetores casados em todos os cortes e transições com causa na tela (zoom através do mapa,
  a placa que vira o app, empurrão do mascote, encaixe na fila, whip pan, a luz que volta).
- Revisão independente quadro a quadro antes do render; `hyperframes check` sem erros.
- Voz neural `pt-BR-FranciscaNeural` (edge-tts). Efeitos sonoros com licença Pixabay.
- Trilha gerada localmente com MusicGen (`facebook/musicgen-small`). **Os pesos do modelo têm
  licença CC-BY-NC 4.0, só uso não comercial**: adequada a este trabalho acadêmico, não a uma peça
  comercial.
- Mapa: o próprio site do LuzViva, com dados do OpenStreetMap (crédito na tela).

Parte dos dados do piloto é simulada pelo pipeline do grupo, como o próprio vídeo avisa no fim.
