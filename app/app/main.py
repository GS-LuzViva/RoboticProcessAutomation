"""API do LuzViva. Rotas e códigos de status seguem docs/especificacao_api.md."""

import io
import json
import logging
import secrets
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, FastAPI, Form, Header, HTTPException, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps, UnidentifiedImageError
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import Field, TypeAdapter, ValidationError

from app import armazenamento, chamados, config
from app.modelos import Categoria, ChamadoAlteracao, ChamadoNovo, Medicao, Ocorrencia, Pergunta, Placa, Texto, agora

log = logging.getLogger("luzviva")

VIEWS = ("vw_mvp_mapa_luminarias", "vw_mvp_fila_manutencao", "vw_mvp_painel_subprefeitura")
SITE = Path(__file__).resolve().parent.parent / "static"
LIMITE_FOTO = 5 * 1024 * 1024
LIMITE_PIXELS = 40_000_000  # ~40 MP cobre câmera de celular; acima disso é bomba de descompressão
TIMEOUT_SERVICOS = 20
ASSISTENTE_INDISPONIVEL = {"resposta": "Assistente indisponível no momento", "fontes": [], "recusou": True, "confianca": 0}

rotas = APIRouter()


def _config(request: Request) -> config.Config:
    return request.app.state.config


def _chamados(request: Request) -> chamados.Repositorio:
    return request.app.state.chamados


Cfg = Annotated[config.Config, Depends(_config)]
Chamados = Annotated[chamados.Repositorio, Depends(_chamados)]


def exigir_token(cfg: Cfg, x_api_key: Annotated[str | None, Header()] = None) -> None:
    """Com LUZVIVA_API_TOKEN definido, exige X-API-Key igual; sem ele, modo desenvolvimento (aberto)."""
    if cfg.api_token and not (x_api_key and secrets.compare_digest(x_api_key.encode(), cfg.api_token.encode())):
        raise HTTPException(401, "X-API-Key ausente ou inválida")


def _ler_view(cfg: config.Config, nome: str) -> dict:
    arquivo = cfg.data / f"{nome}.json"
    if not arquivo.exists():
        raise HTTPException(503, f"{nome} ainda não publicada pelo pipeline")
    return json.loads(arquivo.read_text(encoding="utf-8"))


def _filtrar(view: dict, **filtros: str | None) -> dict:
    """Filtros opcionais, sem diferenciar maiúsculas de minúsculas; `linhas` acompanha o resultado."""
    for campo, valor in filtros.items():
        if valor:
            view["dados"] = [d for d in view["dados"] if str(d.get(campo)).casefold() == valor.strip().casefold()]
    view["linhas"] = len(view["dados"])
    return view


@rotas.get("/health")
def saude(cfg: Cfg):
    return {"status": "ok", "views": {nome: (cfg.data / f"{nome}.json").exists() for nome in VIEWS}}


@rotas.get("/api/luminarias")
def luminarias(cfg: Cfg, subprefeitura: str | None = None, situacao: str | None = None, placa: str | None = None):
    view = _ler_view(cfg, "vw_mvp_mapa_luminarias")
    return _filtrar(view, subprefeitura=subprefeitura, situacao=situacao, placa=placa)


@rotas.get("/api/fila")
def fila(cfg: Cfg, repo: Chamados, subprefeitura: str | None = None):
    view = _filtrar(_ler_view(cfg, "vw_mvp_fila_manutencao"), subprefeitura=subprefeitura)
    # O pipeline roda 1x/dia; o estado do chamado vem do banco, que é o atual.
    abertos = repo.abertos_por_placa()
    for linha in view["dados"]:
        chamado = abertos.get(linha.get("placa"))
        linha["chamado_aberto"] = chamado["id_chamado"] if chamado else None
        linha["status_chamado"] = chamado["status"] if chamado else None
    view["dados"].sort(key=lambda d: d.get("prioridade") or 0, reverse=True)
    return view


@rotas.get("/api/painel")
def painel(cfg: Cfg):
    return _ler_view(cfg, "vw_mvp_painel_subprefeitura")


@rotas.post("/api/medicoes", status_code=201, dependencies=[Depends(exigir_token)])
def nova_medicao(medicao: Medicao, cfg: Cfg, response: Response):
    if not armazenamento.anexar(cfg.dia, "medicoes_robo", "id_medicao", medicao.model_dump(mode="json")):
        response.status_code = 200
        return {"ok": True, "id": medicao.id_medicao, "duplicado": True}
    return {"ok": True, "id": medicao.id_medicao}


# Rota da integração de visão (lote): a ocorrência chega pronta, com confiança e modelo, e pesa na
# prioridade da fila. Por isso exige a mesma chave das outras rotas de máquina. O cidadão usa
# /api/fotos, que fica aberta e calcula a visão no servidor.
@rotas.post("/api/ocorrencias", status_code=201, dependencies=[Depends(exigir_token)])
def nova_ocorrencia(ocorrencia: Ocorrencia, cfg: Cfg, response: Response):
    # `cidadao` não faz parte do modelo, então nunca chega ao arquivo do dia.
    if not armazenamento.anexar(cfg.dia, "ocorrencias_app", "id_ocorrencia", ocorrencia.model_dump(mode="json")):
        response.status_code = 200
        return {"ok": True, "id": ocorrencia.id_ocorrencia, "duplicado": True}
    return {"ok": True, "id": ocorrencia.id_ocorrencia}


def _detectar(visao_url: str, foto_id: str, jpeg: bytes) -> dict:
    """Chama a visão computacional. Sem VISAO_URL ou em falha devolve {} e a ocorrência segue sem visão."""
    if not visao_url:
        return {}
    try:
        resposta = httpx.post(
            f"{visao_url}/detectar", files={"foto": (f"{foto_id}.jpg", jpeg, "image/jpeg")}, timeout=TIMEOUT_SERVICOS
        )
        resposta.raise_for_status()
        resultado = resposta.json()
    except (httpx.HTTPError, ValueError) as erro:
        log.warning("visão indisponível: %s", type(erro).__name__)
        return {}
    if not isinstance(resultado, dict):
        return {}
    if isinstance(resultado.get("placa"), str):
        resultado["placa"] = resultado["placa"].strip().upper()
    # Campo inválido da visão é ignorado (cai no que o cidadão informou) em vez de perder o relato.
    return {campo: resultado[campo] for campo, tipo in _CAMPOS_VISAO.items()
            if resultado.get(campo) is not None and _valido(tipo, resultado[campo])}


_CAMPOS_VISAO = {
    "categoria": TypeAdapter(Categoria),
    "confianca_visao": TypeAdapter(Annotated[float, Field(ge=0, le=1)]),
    "modelo_visao": TypeAdapter(Texto),
    "placa": TypeAdapter(Placa),
}


def _valido(tipo: TypeAdapter, valor) -> bool:
    try:
        tipo.validate_python(valor, strict=not isinstance(valor, int))
    except ValidationError:
        return False
    return True


def _poste_por_placa(cfg: config.Config, placa: str) -> dict | None:
    try:
        mapa = _ler_view(cfg, "vw_mvp_mapa_luminarias")
    except HTTPException:
        return None
    return next((d for d in mapa["dados"] if d.get("placa") == placa), None)


@rotas.post("/api/fotos", status_code=201)
def nova_foto(
    cfg: Cfg,
    foto: UploadFile,
    categoria: Annotated[str | None, Form()] = None,
    placa: Annotated[str | None, Form()] = None,
    lat: Annotated[float | None, Form()] = None,
    lon: Annotated[float | None, Form()] = None,
    area_piloto: Annotated[str | None, Form()] = None,
):
    conteudo = foto.file.read(LIMITE_FOTO + 1)
    if len(conteudo) > LIMITE_FOTO:
        raise HTTPException(413, "foto maior que 5 MB")
    try:
        imagem = Image.open(io.BytesIO(conteudo))
        if imagem.format not in ("JPEG", "PNG"):
            raise HTTPException(415, "envie uma foto JPEG ou PNG")
        if imagem.width * imagem.height > LIMITE_PIXELS:
            raise HTTPException(413, "foto com resolução grande demais")
        # Reencodar sem passar `exif` remove EXIF e GPS; exif_transpose mantém a orientação.
        imagem = ImageOps.exif_transpose(imagem).convert("RGB")
        saida = io.BytesIO()
        imagem.save(saida, "JPEG", quality=85)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(415, "envie uma foto JPEG ou PNG")
    jpeg = saida.getvalue()

    foto_id = secrets.token_hex(8)
    visao = _detectar(cfg.visao_url, foto_id, jpeg)
    placa = (visao.get("placa") or placa or "").strip().upper() or None
    # A placa é a ligação confiável (postes a 12,7 m): o cadastro dá a área (o seletor do site vem
    # com SE por padrão) e completa a coordenada quando o cidadão não compartilhou localização.
    poste = _poste_por_placa(cfg, placa) if placa else None
    if poste:
        area_piloto = poste.get("subprefeitura") or area_piloto
        if lat is None or lon is None:
            lat, lon = poste.get("lat"), poste.get("lon")
    momento = agora()
    try:
        ocorrencia = Ocorrencia(
            id_ocorrencia=f"O{momento:%Y%m%d}-{foto_id}",
            data_hora=momento,
            categoria=visao.get("categoria") or categoria,
            origem="app_foto_cidadao",
            confianca_visao=visao.get("confianca_visao"),
            modelo_visao=visao.get("modelo_visao"),
            foto_id=foto_id,
            lat=lat,
            lon=lon,
            area_piloto=area_piloto,
            placa=placa,
        )
    except ValidationError as erro:
        raise RequestValidationError(erro.errors(include_url=False, include_context=False))

    cfg.fotos.mkdir(parents=True, exist_ok=True)
    (cfg.fotos / f"{foto_id}.jpg").write_bytes(jpeg)
    registro = ocorrencia.model_dump(mode="json")
    armazenamento.anexar(cfg.dia, "ocorrencias_app", "id_ocorrencia", registro)
    return registro


@rotas.get("/api/chamados")
def listar_chamados(repo: Chamados, status: str | None = None, placa: str | None = None, area_piloto: str | None = None):
    lista_status = [s.strip() for s in status.split(",") if s.strip()] if status else None
    dados = repo.listar(status=lista_status, placa=placa, area=area_piloto)
    return {"linhas": len(dados), "dados": dados}


@rotas.get("/api/chamados/{id_chamado}")
def obter_chamado(id_chamado: str, repo: Chamados):
    chamado = repo.obter(id_chamado)
    if not chamado:
        raise HTTPException(404, "chamado não encontrado")
    return chamado


@rotas.post("/api/chamados", status_code=201, dependencies=[Depends(exigir_token)])
def abrir_chamado(novo: ChamadoNovo, repo: Chamados, response: Response):
    momento = agora()
    aberto_em = novo.aberto_em or momento
    concluido_em = novo.concluido_em or (momento if novo.status == "concluido" else None)
    if concluido_em and novo.status != "concluido":
        raise HTTPException(422, "concluido_em só vale para chamado concluído")
    if concluido_em and concluido_em < aberto_em:
        raise HTTPException(422, "concluido_em não pode ser anterior a aberto_em")
    chamado = novo.model_dump(mode="json")
    chamado["concluido_em"] = concluido_em.isoformat(timespec="seconds") if concluido_em else None
    chamado["id_chamado"] = novo.id_chamado or f"CH-{aberto_em:%Y%m%d}-{novo.placa}"
    chamado["aberto_em"] = aberto_em.isoformat(timespec="seconds")
    chamado["atualizado_em"] = (novo.atualizado_em or momento).isoformat(timespec="seconds")
    chamado = repo.abrir(chamado)
    response.headers["Location"] = f"/api/chamados/{chamado['id_chamado']}"
    return chamado


@rotas.patch("/api/chamados/{id_chamado}", dependencies=[Depends(exigir_token)])
def alterar_chamado(id_chamado: str, alteracao: ChamadoAlteracao, repo: Chamados):
    return repo.alterar(id_chamado, alteracao.model_dump(mode="json", exclude_none=True))


@rotas.post("/api/assistente")
def assistente(pergunta: Pergunta, cfg: Cfg):
    if not cfg.ia_url:
        return ASSISTENTE_INDISPONIVEL
    try:
        resposta = httpx.post(f"{cfg.ia_url}/perguntar", json=pergunta.model_dump(exclude_none=True), timeout=TIMEOUT_SERVICOS)
        resposta.raise_for_status()
        resultado = resposta.json()
    except (httpx.HTTPError, ValueError) as erro:
        log.warning("assistente indisponível: %s", type(erro).__name__)
        return ASSISTENTE_INDISPONIVEL
    return resultado if isinstance(resultado, dict) else ASSISTENTE_INDISPONIVEL


@rotas.get("/api/export/{fonte}", dependencies=[Depends(exigir_token)])
def exportar(fonte: str, cfg: Cfg, data: date | None = None):
    if fonte not in armazenamento.FONTES:
        raise HTTPException(404, f"fonte inválida; use uma de: {', '.join(armazenamento.FONTES)}")
    arquivo = armazenamento.caminho(cfg.dia, fonte, data or agora().date())
    if not arquivo.exists():
        raise HTTPException(404, "não há arquivo dessa fonte nessa data")
    return armazenamento.ler(arquivo)


def criar_app() -> FastAPI:
    cfg = config.carregar()

    @asynccontextmanager
    async def ciclo_de_vida(app: FastAPI):
        if not cfg.api_token:
            log.warning("LUZVIVA_API_TOKEN não definido: escrita de medições e chamados está aberta (modo desenvolvimento)")
        app.state.chamados = chamados.Repositorio(cfg.db, cfg.dia)
        yield

    app = FastAPI(title="LuzViva API", version="0.1.0", lifespan=ciclo_de_vida)
    app.state.config = cfg
    if cfg.cors:
        app.add_middleware(CORSMiddleware, allow_origins=cfg.cors, allow_methods=["*"], allow_headers=["*"])
    app.include_router(rotas)
    Instrumentator().instrument(app).expose(app)
    if SITE.is_dir():  # o site é montado por último para não esconder as rotas da API
        app.mount("/", StaticFiles(directory=SITE, html=True), name="site")

        @app.middleware("http")
        async def cache_do_site(request: Request, call_next):
            # index.html sempre revalida (aponta para os arquivos do build atual);
            # os arquivos de assets/ têm hash no nome, então podem ficar em cache para sempre.
            resposta = await call_next(request)
            caminho = request.url.path
            if caminho.startswith("/assets/"):
                resposta.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif caminho == "/" or caminho.endswith(".html"):
                resposta.headers["Cache-Control"] = "no-cache"
            return resposta
    return app


app = criar_app()
