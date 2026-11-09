# Robô de RPA do LuzViva: lê a fila da API do app e abre/acompanha chamados de hora em hora.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    LUZVIVA_RPA_DIR_LOGS=/srv/rpa/logs \
    LUZVIVA_RPA_DIR_SAIDA=/srv/rpa/saida

WORKDIR /srv/rpa
COPY pyproject.toml requirements.txt ./
COPY src/ src/
RUN pip install -r requirements.txt

RUN useradd --system --uid 10002 robo \
    && mkdir -p /srv/rpa/logs /srv/rpa/saida \
    && chown -R robo /srv/rpa/logs /srv/rpa/saida
USER robo

# Fica rodando: uma execução agora e depois uma por intervalo (padrão 1 hora).
CMD ["sh", "-c", "python -m luzviva_rpa --intervalo ${LUZVIVA_RPA_INTERVALO:-3600}"]
