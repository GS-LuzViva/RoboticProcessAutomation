# App LuzViva: API FastAPI + site (o build do React já está em static/, então a imagem não precisa de Node).
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    LUZVIVA_DATA=/srv/app/data \
    LUZVIVA_DIA=/srv/estado/dados_dia \
    LUZVIVA_DB=/srv/estado/dados_dia/luzviva.db \
    LUZVIVA_FOTOS=/srv/estado/fotos

WORKDIR /srv/app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ app/
COPY data/ data/
COPY static/ static/

# Usuário sem privilégio; o estado (arquivos do dia, banco de chamados, fotos) fica num volume.
RUN useradd --system --uid 10001 luzviva \
    && mkdir -p /srv/estado/dados_dia /srv/estado/fotos \
    && chown -R luzviva /srv/estado
USER luzviva

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).status == 200 else 1)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
