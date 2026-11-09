import json

from app.modelos import agora

CHAMADO = {"placa": "IP0723371", "area_piloto": "SE", "prioridade": 60, "situacao_detectada": "apagada",
           "aberto_em": "2026-11-09T07:00:00"}


def abrir(cliente, **extra):
    return cliente.post("/api/chamados", json={**CHAMADO, **extra})


def test_post_201_com_location_e_padroes(cliente):
    resposta = abrir(cliente)
    assert resposta.status_code == 201
    chamado = resposta.json()
    assert chamado["id_chamado"] == "CH-20261109-IP0723371"
    assert resposta.headers["location"] == "/api/chamados/CH-20261109-IP0723371"
    assert (chamado["status"], chamado["origem"], chamado["concluido_em"], chamado["equipe"]) == ("aberto", "rpa", None, None)
    assert chamado["aberto_em"] == "2026-11-09T07:00:00"
    assert chamado["atualizado_em"]  # padrão = agora
    assert cliente.get(resposta.headers["location"]).json() == chamado


def test_post_409_placa_com_chamado_aberto(cliente):
    abrir(cliente)
    resposta = abrir(cliente, id_chamado="CH-OUTRO")
    assert resposta.status_code == 409
    assert resposta.json()["detail"]["id_chamado"] == "CH-20261109-IP0723371"


def test_post_409_id_repetido(cliente):
    abrir(cliente, id_chamado="CH-1")
    cliente.patch("/api/chamados/CH-1", json={"status": "cancelado"})
    resposta = abrir(cliente, id_chamado="CH-1")
    assert resposta.status_code == 409
    assert resposta.json()["detail"]["id_chamado"] == "CH-1"


def test_post_concluido_antes_da_abertura_422(cliente):
    assert abrir(cliente, status="concluido", concluido_em="2026-11-08T07:00:00").status_code == 422


def test_patch_transicoes(cliente):
    id_chamado = abrir(cliente).json()["id_chamado"]
    url = f"/api/chamados/{id_chamado}"

    em_atendimento = cliente.patch(url, json={"status": "em_atendimento", "equipe": "EQUIPE-CENTRO"})
    assert em_atendimento.status_code == 200
    assert em_atendimento.json()["equipe"] == "EQUIPE-CENTRO"
    assert cliente.patch(url, json={"status": "em_atendimento"}).status_code == 200  # idempotente
    assert cliente.patch(url, json={"status": "aberto"}).status_code == 409  # não volta

    concluido = cliente.patch(url, json={"status": "concluido"})
    assert concluido.status_code == 200
    assert concluido.json()["concluido_em"]  # sem concluido_em, usa agora
    assert cliente.patch(url, json={"status": "concluido"}).status_code == 200
    assert cliente.patch(url, json={"status": "cancelado"}).status_code == 409  # estado final

    # Depois de concluído, a placa pode receber um chamado novo
    assert abrir(cliente, id_chamado="CH-NOVO").status_code == 201


def test_patch_concluido_em_antes_da_abertura_422(cliente):
    id_chamado = abrir(cliente).json()["id_chamado"]
    resposta = cliente.patch(f"/api/chamados/{id_chamado}", json={"status": "concluido", "concluido_em": "2026-11-08T23:00:00"})
    assert resposta.status_code == 422
    assert cliente.get(f"/api/chamados/{id_chamado}").json()["status"] == "aberto"


def test_patch_404_e_campos_fora_do_contrato_422(cliente):
    assert cliente.patch("/api/chamados/CH-NAO-EXISTE", json={"status": "cancelado"}).status_code == 404
    assert cliente.get("/api/chamados/CH-NAO-EXISTE").status_code == 404
    id_chamado = abrir(cliente).json()["id_chamado"]
    assert cliente.patch(f"/api/chamados/{id_chamado}", json={"prioridade": 100}).status_code == 422


def test_arquivo_do_dia_guarda_ultimo_estado(cliente, ambiente):
    id_chamado = abrir(cliente).json()["id_chamado"]
    cliente.patch(f"/api/chamados/{id_chamado}", json={"status": "em_atendimento"})

    arquivo = ambiente / "dados_dia" / "chamados_rpa" / f"chamados_rpa_{agora().date().isoformat()}.json"
    dados = json.loads(arquivo.read_text(encoding="utf-8"))["dados"]
    assert len(dados) == 1
    assert dados[0]["id_chamado"] == id_chamado and dados[0]["status"] == "em_atendimento"
    assert cliente.get("/api/export/chamados_rpa").json()["dados"] == dados


def test_listar_filtros_e_ordem(cliente):
    abrir(cliente, placa="IP0000001", prioridade=30, aberto_em="2026-11-09T08:00:00")
    abrir(cliente, placa="IP0000002", prioridade=90, area_piloto="PINHEIROS")
    abrir(cliente, placa="IP0000003", prioridade=30, aberto_em="2026-11-09T06:00:00")
    cliente.patch("/api/chamados/CH-20261109-IP0000002", json={"status": "em_atendimento"})
    cliente.patch("/api/chamados/CH-20261109-IP0000003", json={"status": "cancelado"})

    todos = cliente.get("/api/chamados").json()
    assert todos["linhas"] == 3
    assert [c["placa"] for c in todos["dados"]] == ["IP0000002", "IP0000003", "IP0000001"]

    abertos = cliente.get("/api/chamados", params={"status": "aberto,em_atendimento"}).json()
    assert [c["placa"] for c in abertos["dados"]] == ["IP0000002", "IP0000001"]
    assert cliente.get("/api/chamados", params={"placa": "IP0000003"}).json()["dados"][0]["status"] == "cancelado"
    assert cliente.get("/api/chamados", params={"area_piloto": "pinheiros"}).json()["linhas"] == 1


def test_concluido_em_so_em_chamado_concluido(cliente):
    novo = {"placa": "IP0000009", "area_piloto": "SE", "prioridade": 60, "situacao_detectada": "apagada"}
    aberto = cliente.post("/api/chamados", json=novo).json()
    assert cliente.patch(f"/api/chamados/{aberto['id_chamado']}", json={"concluido_em": "2099-01-01T00:00:00"}).status_code == 422
    concluido = cliente.post("/api/chamados", json={**novo, "placa": "IP0000010", "status": "concluido"}).json()
    assert concluido["concluido_em"] is not None
