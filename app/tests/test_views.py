def test_health_lista_views(cliente):
    resposta = cliente.get("/health")
    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok", "views": {
        "vw_mvp_mapa_luminarias": True, "vw_mvp_fila_manutencao": True, "vw_mvp_painel_subprefeitura": True}}


def test_health_nao_falha_sem_views_e_views_dao_503(novo_cliente):
    cliente = novo_cliente(com_views=False)
    assert cliente.get("/health").json()["views"]["vw_mvp_fila_manutencao"] is False
    for rota in ("/api/luminarias", "/api/fila", "/api/painel"):
        resposta = cliente.get(rota)
        assert resposta.status_code == 503
        assert "detail" in resposta.json()


def test_metrics_prometheus(cliente):
    cliente.get("/health")
    resposta = cliente.get("/metrics")
    assert resposta.status_code == 200
    assert "http_requests_total" in resposta.text


def test_luminarias_envelope_e_filtros(cliente):
    tudo = cliente.get("/api/luminarias").json()
    assert set(tudo) == {"view", "gerado_em", "linhas", "dados"}
    assert tudo["linhas"] == 3

    se = cliente.get("/api/luminarias", params={"subprefeitura": "se"}).json()
    assert [d["id_luminaria"] for d in se["dados"]] == [1] and se["linhas"] == 1
    assert cliente.get("/api/luminarias", params={"subprefeitura": "campo limpo"}).json()["linhas"] == 1
    assert cliente.get("/api/luminarias", params={"situacao": "INSUFICIENTE"}).json()["dados"][0]["placa"] == "IP0000002"
    assert cliente.get("/api/luminarias", params={"placa": "ip0000003"}).json()["linhas"] == 1
    assert cliente.get("/api/luminarias", params={"placa": "IP0000003", "situacao": "ok"}).json()["linhas"] == 0


def test_painel(cliente):
    assert cliente.get("/api/painel").json()["dados"][0]["subprefeitura"] == "SE"


def test_fila_ordenada_e_com_chamado_do_banco(cliente):
    fila = cliente.get("/api/fila").json()
    assert [d["prioridade"] for d in fila["dados"]] == [80, 30]
    # O banco não tem o chamado "CH-VELHO" do pipeline: o estado atual (nenhum) vence.
    assert all(d["chamado_aberto"] is None and d["status_chamado"] is None for d in fila["dados"])

    chamado = {"placa": "IP0000001", "area_piloto": "SE", "prioridade": 80, "situacao_detectada": "apagada"}
    id_chamado = cliente.post("/api/chamados", json=chamado).json()["id_chamado"]
    primeira = cliente.get("/api/fila").json()["dados"][0]
    assert (primeira["chamado_aberto"], primeira["status_chamado"]) == (id_chamado, "aberto")

    cliente.patch(f"/api/chamados/{id_chamado}", json={"status": "em_atendimento"})
    assert cliente.get("/api/fila").json()["dados"][0]["status_chamado"] == "em_atendimento"
    cliente.patch(f"/api/chamados/{id_chamado}", json={"status": "concluido"})
    assert cliente.get("/api/fila").json()["dados"][0]["chamado_aberto"] is None


def test_fila_filtro_subprefeitura(cliente):
    fila = cliente.get("/api/fila", params={"subprefeitura": "Pinheiros"}).json()
    assert fila["linhas"] == 1 and fila["dados"][0]["placa"] == "IP0000002"


def test_cache_do_site(cliente):
    from app.main import SITE
    if not (SITE / "index.html").exists():
        return
    assert cliente.get("/").headers.get("cache-control") == "no-cache"
