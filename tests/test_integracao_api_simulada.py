"""Ponta a ponta por HTTP de verdade: robô (ApiCliente real) contra a API simulada do app."""

import threading

import pytest

from api_simulada import EstadoApi, criar_servidor
from conftest import AGORA
from luzviva_rpa.cliente import ApiCliente
from luzviva_rpa.execucao import executar


@pytest.fixture
def api():
    servidor, estado = criar_servidor(0, EstadoApi(agora=AGORA, token="token-de-teste"))
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{servidor.server_port}", estado
    servidor.shutdown()
    servidor.server_close()


def test_execucao_ponta_a_ponta_e_idempotente(api, arquivo_log, saida):
    url, estado = api
    cliente = ApiCliente(url, "token-de-teste", dormir=lambda s: None)

    primeira = executar(cliente, saida, relogio=lambda: AGORA)["contagem"]
    assert primeira == {"lidos": 8, "abertos": 3, "monitorar": 1, "duplicados": 2, "invalidos": 2,
                        "em_atendimento": 1, "escalados": 1, "concluidos": 1, "falhas": 0}
    assert sorted(p["placa"] for p in estado.posts) == ["IP0298167", "IP0634410", "IP0723371"]
    assert estado.dados["chamados"]["CH-20261107-IP0300003"]["status"] == "concluido"

    segunda = executar(cliente, saida, relogio=lambda: AGORA)["contagem"]
    assert segunda["abertos"] == 0 and segunda["duplicados"] == 5  # nada é aberto duas vezes
    assert len(estado.posts) == 3


def test_token_errado_vira_falha_por_item_sem_derrubar_o_robo(api, arquivo_log, saida):
    url, estado = api
    resumo = executar(ApiCliente(url, "token-errado", dormir=lambda s: None), saida, relogio=lambda: AGORA)
    assert resumo["contagem"]["abertos"] == 0 and resumo["contagem"]["falhas"] == 5  # 3 POST + 2 PATCH
    assert estado.posts == []
    assert "HTTP 401" in arquivo_log.read_text(encoding="utf-8")
