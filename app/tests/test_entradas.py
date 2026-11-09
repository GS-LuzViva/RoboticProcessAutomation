import json

import pytest

from app.modelos import agora

MEDICAO = {"id_medicao": "M2026110900001", "robo_id": "ROBO-01", "data_hora": "2026-11-09T19:24:10",
           "lat": -23.5591, "lon": -46.6349, "lux": 0.4, "situacao_robo": "apagada", "sensor": "LDR-GL5528",
           "bateria_pct": 87, "area_piloto": "SE", "placa": "IP0723371"}
OCORRENCIA = {"id_ocorrencia": "O20261109-0007", "data_hora": "2026-11-09T21:03:00", "categoria": "luminaria_apagada",
              "origem": "app_foto_cidadao", "confianca_visao": 0.91, "modelo_visao": "yolo11n-luzviva-v1",
              "foto_id": "a3f9c2e1b7d04411", "lat": -23.5712, "lon": -46.6921, "area_piloto": "PINHEIROS"}


def arquivo_de_hoje(raiz, fonte):
    caminho = raiz / "dados_dia" / fonte / f"{fonte}_{agora().date().isoformat()}.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


def test_medicao_201_e_depois_duplicada_200(cliente, ambiente):
    primeira = cliente.post("/api/medicoes", json=MEDICAO)
    assert primeira.status_code == 201
    assert primeira.json() == {"ok": True, "id": "M2026110900001"}

    repetida = cliente.post("/api/medicoes", json=MEDICAO)
    assert repetida.status_code == 200
    assert repetida.json() == {"ok": True, "id": "M2026110900001", "duplicado": True}

    arquivo = arquivo_de_hoje(ambiente, "medicoes_robo")
    assert arquivo["_coleta"] == {"fonte": "medicoes_robo", "data_coleta": agora().date().isoformat(), "url": "app://luzviva"}
    assert arquivo["dados"] == [MEDICAO]


def test_medicao_sem_gps_e_aceita(cliente):
    sem_gps = {**MEDICAO, "id_medicao": "M2", "lat": None, "lon": None}
    assert cliente.post("/api/medicoes", json=sem_gps).status_code == 201


def test_ocorrencia_descarta_cidadao(cliente, ambiente):
    com_cidadao = {**OCORRENCIA, "cidadao": {"nome": "Fulana", "email": "fulana@exemplo.com", "telefone": "+55 11 90000-0000"}}
    assert cliente.post("/api/ocorrencias", json=com_cidadao).status_code == 201
    assert cliente.post("/api/ocorrencias", json=com_cidadao).json()["duplicado"] is True

    gravado = arquivo_de_hoje(ambiente, "ocorrencias_app")["dados"]
    assert len(gravado) == 1
    assert "cidadao" not in gravado[0]
    assert "fulana" not in json.dumps(gravado).lower()


@pytest.mark.parametrize("rota, corpo", [
    ("/api/medicoes", {**MEDICAO, "placa": "IP123"}),
    ("/api/medicoes", {**MEDICAO, "lux": -1}),
    ("/api/medicoes", {**MEDICAO, "area_piloto": "MOOCA"}),
    ("/api/medicoes", {**MEDICAO, "data_hora": "ontem à noite"}),
    ("/api/medicoes", {k: v for k, v in MEDICAO.items() if k != "id_medicao"}),
    ("/api/ocorrencias", {**OCORRENCIA, "confianca_visao": 1.7}),
    ("/api/ocorrencias", {**OCORRENCIA, "categoria": "gato_no_poste"}),
    ("/api/ocorrencias", {**OCORRENCIA, "categoria": None}),
    ("/api/ocorrencias", {**OCORRENCIA, "origem": "drone"}),
    ("/api/chamados", {"placa": "IP0000001", "area_piloto": "SE", "prioridade": 101, "situacao_detectada": "apagada"}),
    ("/api/chamados", {"placa": "IP0000001", "area_piloto": "SE", "prioridade": 50.5, "situacao_detectada": "apagada"}),
    ("/api/chamados", {"placa": "IP0000001", "area_piloto": "SE", "prioridade": 60, "situacao_detectada": "ok"}),
    ("/api/chamados", {"placa": "IP0000001", "area_piloto": "SE", "prioridade": 60, "situacao_detectada": "apagada",
                       "status": "resolvido"}),
    ("/api/assistente", {"pergunta": ""}),
])
def test_entradas_invalidas_dao_422(cliente, rota, corpo):
    resposta = cliente.post(rota, json=corpo)
    assert resposta.status_code == 422
    assert "detail" in resposta.json()


def test_export(cliente):
    cliente.post("/api/medicoes", json=MEDICAO)
    hoje = agora().date().isoformat()

    padrao = cliente.get("/api/export/medicoes_robo")
    assert padrao.status_code == 200
    assert padrao.json()["dados"][0]["id_medicao"] == MEDICAO["id_medicao"]
    assert cliente.get("/api/export/medicoes_robo", params={"data": hoje}).status_code == 200

    assert cliente.get("/api/export/luminarias").status_code == 404
    assert cliente.get("/api/export/ocorrencias_app", params={"data": "2020-01-01"}).status_code == 404
    assert cliente.get("/api/export/medicoes_robo", params={"data": "2026-13-40"}).status_code == 422


def test_token_exigido_quando_definido(novo_cliente, monkeypatch):
    monkeypatch.setenv("LUZVIVA_API_TOKEN", "segredo-de-teste")
    cliente = novo_cliente()
    chamado = {"placa": "IP0000001", "area_piloto": "SE", "prioridade": 60, "situacao_detectada": "apagada"}

    assert cliente.post("/api/medicoes", json=MEDICAO).status_code == 401
    assert cliente.post("/api/medicoes", json=MEDICAO, headers={"X-API-Key": "errado"}).status_code == 401
    assert cliente.post("/api/chamados", json=chamado).status_code == 401
    assert cliente.patch("/api/chamados/X", json={"status": "cancelado"}).status_code == 401

    ok = {"X-API-Key": "segredo-de-teste"}
    assert cliente.post("/api/medicoes", json=MEDICAO, headers=ok).status_code == 201
    assert cliente.post("/api/chamados", json=chamado, headers=ok).status_code == 201
    # Rotas do cidadão e de leitura continuam abertas
    assert cliente.post("/api/ocorrencias", json=OCORRENCIA).status_code == 201
    assert cliente.get("/api/fila").status_code == 200


def test_export_exige_token_quando_definido(novo_cliente, monkeypatch):
    monkeypatch.setenv("LUZVIVA_API_TOKEN", "segredo-de-teste")
    cliente = novo_cliente()
    assert cliente.get("/api/export/ocorrencias_app").status_code == 401
    assert cliente.get("/api/export/ocorrencias_app", headers={"X-API-Key": "segredo-de-teste"}).status_code == 404
