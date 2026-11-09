"""Cliente HTTP: timeout, nova tentativa com espera exponencial, 409 e erros de pedido."""

import pytest
import requests
import responses

from luzviva_rpa.cliente import ApiCliente, ApiIndisponivel, ErroHttp, RespostaInvalida

URL = "http://api.teste"


def novo_cliente(esperas, **kw):
    return ApiCliente(URL, dormir=esperas.append, **kw)


@responses.activate
def test_api_fora_do_ar_tenta_4_vezes_com_espera_exponencial_e_desiste(caplog):
    responses.get(f"{URL}/api/fila", body=requests.ConnectionError("recusada"))
    esperas = []
    with pytest.raises(ApiIndisponivel, match="após 4 tentativas: GET /api/fila"):
        novo_cliente(esperas).obter_fila()
    assert len(responses.calls) == 4
    assert esperas == [2.0, 4.0, 8.0]  # sem espera depois da última tentativa
    assert caplog.text.count("falha GET /api/fila (tentativa") == 4


@responses.activate
def test_erro_5xx_temporario_e_recuperado_na_tentativa_seguinte():
    responses.get(f"{URL}/api/fila", status=503, json={"detail": "view indisponível"})
    responses.get(f"{URL}/api/fila", json={"view": "v", "linhas": 0, "dados": []})
    esperas = []
    assert novo_cliente(esperas).obter_fila()["dados"] == []
    assert esperas == [2.0]


@responses.activate
def test_timeout_de_20s_e_token_no_header():
    responses.post(f"{URL}/api/chamados", status=201, json={"id_chamado": "CH-1"})
    criado, corpo = novo_cliente([], token="segredo-de-teste").abrir_chamado({"placa": "IP0723371"})
    assert criado and corpo == {"id_chamado": "CH-1"}
    pedido = responses.calls[0].request
    assert pedido.headers["X-API-Key"] == "segredo-de-teste"
    assert pedido.req_kwargs["timeout"] == 20


@responses.activate
def test_sem_token_nao_envia_header():
    responses.get(f"{URL}/api/luminarias", json={"dados": []})
    novo_cliente([]).obter_luminarias()
    assert "X-API-Key" not in responses.calls[0].request.headers


@responses.activate
def test_409_no_post_e_duplicado_sem_nova_tentativa():
    responses.post(f"{URL}/api/chamados", status=409, json={"detail": "CH-20261109-IP0723371"})
    criado, corpo = novo_cliente([]).abrir_chamado({"placa": "IP0723371"})
    assert criado is False and len(responses.calls) == 1


@responses.activate
def test_422_nao_repete_e_levanta_erro_http():
    responses.patch(f"{URL}/api/chamados/CH-1", status=422, json=[{"msg": "inválido"}])
    esperas = []
    with pytest.raises(ErroHttp, match="HTTP 422"):
        novo_cliente(esperas).atualizar_chamado("CH-1", {"status": "concluido"})
    assert len(responses.calls) == 1 and esperas == []


@responses.activate
@pytest.mark.parametrize("corpo", ["{isto não é json", ""])
def test_corpo_invalido_ou_vazio_levanta_resposta_invalida(corpo):
    responses.get(f"{URL}/api/fila", body=corpo, status=200)
    with pytest.raises(RespostaInvalida):
        novo_cliente([]).obter_fila()


@responses.activate
def test_chamados_abertos_filtra_por_status():
    responses.get(f"{URL}/api/chamados", json={"linhas": 1, "dados": [{"placa": "IP0723371"}]},
                  match=[responses.matchers.query_param_matcher({"status": "aberto,em_atendimento"})])
    assert novo_cliente([]).obter_chamados_abertos() == [{"placa": "IP0723371"}]
