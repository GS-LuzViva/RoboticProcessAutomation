import json

import pytest
from fastapi.testclient import TestClient

from app.main import criar_app

MAPA = [
    {"id_luminaria": 1, "placa": "IP0000001", "endereco": "RUA A", "subprefeitura": "SE", "lat": -23.55, "lon": -46.63,
     "ultima_medicao": "2026-11-08T20:00:00", "ultimo_lux": 0.4, "situacao": "apagada", "ocorrencias_app": 1},
    {"id_luminaria": 2, "placa": "IP0000002", "endereco": "RUA B", "subprefeitura": "PINHEIROS", "lat": -23.56, "lon": -46.69,
     "ultima_medicao": "2026-11-08T21:00:00", "ultimo_lux": 3.0, "situacao": "insuficiente", "ocorrencias_app": 0},
    {"id_luminaria": 3, "placa": "IP0000003", "endereco": "RUA C", "subprefeitura": "CAMPO LIMPO", "lat": -23.64, "lon": -46.75,
     "ultima_medicao": None, "ultimo_lux": None, "situacao": "sem_medicao", "ocorrencias_app": 0},
]
FILA = [  # fora de ordem e com um chamado "velho" do pipeline, para testar ordenação e sobreposição
    {**MAPA[1], "chamado_aberto": "CH-VELHO", "status_chamado": "aberto", "confianca_visao": 0, "prioridade": 30},
    {**MAPA[0], "chamado_aberto": None, "status_chamado": None, "confianca_visao": 0.9, "prioridade": 80},
]
PAINEL = [{"subprefeitura": "SE", "luminarias_cadastradas": 10, "luminarias_inspecionadas": 1, "apagadas": 1,
           "insuficientes": 0, "pct_com_falha": 100.0, "mediana_horas_ate_reparo": None, "chamados_em_aberto": 0}]


def escrever_views(pasta):
    pasta.mkdir(parents=True, exist_ok=True)
    for nome, dados in (("vw_mvp_mapa_luminarias", MAPA), ("vw_mvp_fila_manutencao", FILA),
                        ("vw_mvp_painel_subprefeitura", PAINEL)):
        envelope = {"view": nome, "gerado_em": "2026-11-09T06:00:00", "linhas": len(dados), "dados": dados}
        (pasta / f"{nome}.json").write_text(json.dumps(envelope), encoding="utf-8")


@pytest.fixture
def ambiente(tmp_path, monkeypatch):
    """Aponta todas as pastas para tmp_path e limpa as variáveis opcionais."""
    monkeypatch.setenv("LUZVIVA_DATA", str(tmp_path / "data"))
    monkeypatch.setenv("LUZVIVA_DIA", str(tmp_path / "dados_dia"))
    monkeypatch.setenv("LUZVIVA_DB", str(tmp_path / "dados_dia" / "luzviva.db"))
    monkeypatch.setenv("LUZVIVA_FOTOS", str(tmp_path / "fotos"))
    for nome in ("LUZVIVA_API_TOKEN", "LUZVIVA_CORS", "IA_URL", "VISAO_URL"):
        monkeypatch.delenv(nome, raising=False)
    return tmp_path


@pytest.fixture
def novo_cliente(ambiente):
    """Fábrica: cria o app depois de o teste ajustar variáveis de ambiente."""
    abertos = []

    def criar(com_views=True):
        if com_views:
            escrever_views(ambiente / "data")
        cliente = TestClient(criar_app())
        cliente.__enter__()
        abertos.append(cliente)
        return cliente

    yield criar
    for cliente in abertos:
        cliente.__exit__(None, None, None)


@pytest.fixture
def cliente(novo_cliente):
    return novo_cliente()
