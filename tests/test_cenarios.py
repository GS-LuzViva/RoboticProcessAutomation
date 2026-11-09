"""Os três cenários avaliados (sucesso, decisão e falha) e o acompanhamento, de ponta a ponta no robô.

A API é substituída por um cliente falso em memória (FakeCliente, em conftest.py).
"""

import json

from conftest import AGORA, FakeCliente, chamado, envelope, item_fila
from luzviva_rpa.cliente import ApiIndisponivel, RespostaInvalida
from luzviva_rpa.execucao import executar


def rodar(cliente, saida, **kw):
    return executar(cliente, saida, relogio=lambda: AGORA, **kw)


# ---------------------------------------------------------------- 1. sucesso

def test_cenario_sucesso_abre_chamados_para_itens_elegiveis(arquivo_log, saida):
    fila = envelope([
        item_fila("IP0723371", 90, "apagada", "SE"),
        item_fila("IP0298167", 70, "apagada", "PINHEIROS"),
        item_fila("IP0634410", 40, "insuficiente", "CAMPO LIMPO"),
    ])
    cliente = FakeCliente(fila=fila)

    resumo = rodar(cliente, saida)

    assert [p["id_chamado"] for p in cliente.posts] == [
        "CH-20261110-IP0723371", "CH-20261110-IP0298167", "CH-20261110-IP0634410"]
    assert [p["equipe"] for p in cliente.posts] == ["EQUIPE-CENTRO", "EQUIPE-OESTE", "EQUIPE-SUL"]
    assert all(p["status"] == "aberto" and p["origem"] == "rpa" for p in cliente.posts)
    assert resumo["contagem"]["lidos"] == 3 and resumo["contagem"]["abertos"] == 3
    assert resumo["contagem"]["falhas"] == 0 and resumo["erros"] == []
    # resumo da execução gravado em JSON, com a duração (AHT do robô)
    gravado = json.loads(next(saida.glob("execucao_*.json")).read_text(encoding="utf-8"))
    assert gravado["contagem"]["abertos"] == 3 and gravado["duracao_s"] >= 0
    texto = arquivo_log.read_text(encoding="utf-8")
    assert "chamado aberto id=CH-20261110-IP0723371" in texto and "resumo: lidos=3 abertos=3" in texto


def test_simulacao_decide_mas_nao_grava_na_api(arquivo_log, saida):
    cliente = FakeCliente(fila=envelope([item_fila()]),
                          chamados=[chamado(aberto_em="2026-11-08T08:00:00")])
    resumo = rodar(cliente, saida, simular=True)
    assert cliente.posts == [] and cliente.patches == []
    assert resumo["simulacao"] is True
    assert resumo["contagem"]["abertos"] == 1 and resumo["contagem"]["em_atendimento"] == 1
    assert "[simulação] abriria chamado" in arquivo_log.read_text(encoding="utf-8")


# ---------------------------------------------------------------- 2. decisão

def test_cenario_decisao_corte_duplicado_invalido_e_placa_repetida(arquivo_log, saida):
    fila = envelope([
        item_fila("IP0102030", 150),                                   # prioridade inválida
        item_fila("IP0723371", 90),                                    # abre
        item_fila("IP0511204", 70, subprefeitura="CAMPO LIMPO"),       # já tem chamado aberto
        item_fila("IP0723371", 60),                                    # placa repetida na fila
        item_fila("IP0845512", 20, "ok"),                              # abaixo do corte → monitorar
        item_fila("IP0999999", 29, "insuficiente"),                    # abaixo do corte → monitorar
    ])
    cliente = FakeCliente(fila=fila, chamados=[chamado("IP0511204", "2026-11-09T20:00:00",
                                                       "em_atendimento", area="CAMPO LIMPO")])

    c = rodar(cliente, saida)["contagem"]

    assert [p["placa"] for p in cliente.posts] == ["IP0723371"]
    assert (c["lidos"], c["abertos"], c["monitorar"], c["duplicados"], c["invalidos"]) == (6, 1, 2, 2, 1)
    texto = arquivo_log.read_text(encoding="utf-8")
    assert "monitorar placa=IP0845512 prioridade=20" in texto
    assert "item inválido posicao=1 placa=IP0102030 motivo=prioridade" in texto
    assert "duplicado placa=IP0511204" in texto


def test_conflito_409_da_api_conta_como_duplicado(arquivo_log, saida):
    cliente = FakeCliente(fila=envelope([item_fila()]), post_409={"IP0723371"})
    c = rodar(cliente, saida)["contagem"]
    assert (c["abertos"], c["duplicados"], c["falhas"]) == (0, 1, 0)


# ---------------------------------------------------------------- 3. falha

def test_cenario_falha_api_fora_do_ar_registra_erro_e_nao_quebra(arquivo_log, saida):
    fora = ApiIndisponivel("GET", "/api/fila", 4)
    cliente = FakeCliente(erros={"obter_fila": fora,
                                 "obter_chamados_abertos": ApiIndisponivel("GET", "/api/chamados", 4)})

    resumo = rodar(cliente, saida)  # não levanta exceção

    assert resumo["erros"] == ["fila: API indisponível após 4 tentativas: GET /api/fila",
                               "chamados: API indisponível após 4 tentativas: GET /api/chamados"]
    assert resumo["contagem"]["lidos"] == 0
    texto = arquivo_log.read_text(encoding="utf-8")
    assert "ERROR   | fase fila abortada: API indisponível" in texto
    assert "execução terminou com 2 erro(s) de fase" in texto
    assert list(saida.glob("execucao_*.json")), "o resumo é gravado mesmo com a API fora"


def test_cenario_falha_fila_json_invalido_segue_para_os_chamados(arquivo_log, saida):
    cliente = FakeCliente(erros={"obter_fila": RespostaInvalida("GET", "/api/fila", "JSON inválido")},
                          chamados=[chamado(aberto_em="2026-11-08T08:00:00")])
    resumo = rodar(cliente, saida)
    assert resumo["erros"] == ["fila: resposta inválida em GET /api/fila: JSON inválido"]
    assert resumo["contagem"]["em_atendimento"] == 1  # a fase de acompanhamento rodou


def test_cenario_falha_fila_sem_lista_de_dados(arquivo_log, saida):
    resumo = rodar(FakeCliente(fila={"view": "vw_mvp_fila_manutencao", "dados": "quebrado"}), saida)
    assert resumo["erros"] == ["fila: campo 'dados' não é uma lista"]


def test_fila_com_linhas_inconsistentes_avisa_e_processa(arquivo_log, saida):
    fila = envelope([item_fila()])
    fila["linhas"] = 5
    resumo = rodar(FakeCliente(fila=fila), saida)
    assert resumo["contagem"]["abertos"] == 1
    assert "fila inconsistente: linhas=5, mas dados tem 1 itens" in arquivo_log.read_text(encoding="utf-8")


def test_fila_vazia_e_aviso_nao_erro(arquivo_log, saida):
    resumo = rodar(FakeCliente(fila=envelope([])), saida)
    assert resumo["erros"] == [] and resumo["contagem"]["lidos"] == 0
    assert "WARNING | fila vazia" in arquivo_log.read_text(encoding="utf-8")


def test_falha_em_um_item_nao_interrompe_a_repeticao(arquivo_log, saida):
    fila = envelope([item_fila("IP0000001", 90), item_fila("IP0000002", 80), item_fila("IP0000003", 70)])
    cliente = FakeCliente(fila=fila, post_falha={"IP0000002"})
    c = rodar(cliente, saida)["contagem"]
    assert [p["placa"] for p in cliente.posts] == ["IP0000001", "IP0000003"]
    assert (c["abertos"], c["falhas"]) == (2, 1)
    assert "ERROR   | falha ao abrir chamado id=CH-20261110-IP0000002" in arquivo_log.read_text(encoding="utf-8")


def test_sem_lista_de_chamados_usa_campo_da_fila_e_segue(arquivo_log, saida):
    fila = envelope([item_fila("IP0000001", 90, chamado_aberto="CH-1", status_chamado="aberto"),
                     item_fila("IP0000002", 80)])
    cliente = FakeCliente(fila=fila, erros={"obter_chamados_abertos": ApiIndisponivel("GET", "/api/chamados", 4)})
    resumo = rodar(cliente, saida)
    assert [p["placa"] for p in cliente.posts] == ["IP0000002"]
    assert resumo["contagem"]["duplicados"] == 1


# ---------------------------------------------------------------- acompanhamento

def test_acompanhamento_em_atendimento_escalonamento_e_conclusao(arquivo_log, saida):
    chamados = [
        chamado("IP0400001", "2026-11-09T07:00:00", "aberto", "insuficiente", "PINHEIROS", equipe=None),
        chamado("IP0511204", "2026-11-03T08:00:00", "em_atendimento", "apagada", "CAMPO LIMPO"),
        chamado("IP0300003", "2026-11-07T08:00:00", "em_atendimento", "apagada", "SE"),
        chamado("IP0600006", "2026-11-10T07:00:00", "aberto"),
    ]
    luminarias = [{"placa": "IP0300003", "situacao": "ok", "ultima_medicao": "2026-11-09T21:10:00"},
                  {"placa": "IP0511204", "situacao": "apagada", "ultima_medicao": "2026-11-09T21:00:00"}]
    cliente = FakeCliente(fila=envelope([]), chamados=chamados, luminarias=luminarias)

    c = rodar(cliente, saida)["contagem"]

    assert cliente.patches == [
        ("CH-20261109-IP0400001", {"status": "em_atendimento", "equipe": "EQUIPE-OESTE"}),
        ("CH-20261107-IP0300003", {"status": "concluido", "concluido_em": "2026-11-09T21:10:00"}),
    ]
    assert (c["em_atendimento"], c["concluidos"], c["escalados"]) == (1, 1, 1)
    escalados = json.loads((saida / "escalonamentos_2026-11-10.json").read_text(encoding="utf-8"))
    assert escalados == [{"id_chamado": "CH-20261103-IP0511204", "placa": "IP0511204", "area": "CAMPO LIMPO",
                          "situacao_detectada": "apagada", "dias_em_aberto": 7.0, "prazo_dias": 5,
                          "registrado_em": "2026-11-10T08:00:00"}]
    assert "WARNING | ESCALONAMENTO prazo vencido id=CH-20261103-IP0511204" in arquivo_log.read_text(encoding="utf-8")


def test_escalonamento_nao_duplica_no_arquivo_do_dia(arquivo_log, saida):
    cliente = FakeCliente(fila=envelope([]), chamados=[
        chamado("IP0511204", "2026-11-03T08:00:00", "em_atendimento")])
    rodar(cliente, saida)
    rodar(cliente, saida)
    escalados = json.loads((saida / "escalonamentos_2026-11-10.json").read_text(encoding="utf-8"))
    assert len(escalados) == 1


def test_falha_no_patch_conta_falha_e_segue(arquivo_log, saida):
    cliente = FakeCliente(fila=envelope([]), chamados=[chamado(aberto_em="2026-11-08T08:00:00")],
                          erros={"atualizar_chamado": ApiIndisponivel("PATCH", "/api/chamados/x", 4)})
    c = rodar(cliente, saida)["contagem"]
    assert (c["em_atendimento"], c["falhas"]) == (0, 1)


# ---------------------------------------------------------------- LGPD

def test_log_nao_tem_dado_de_cidadao(arquivo_log, saida):
    cidadao = {"nome": "Maria Exemplo da Silva", "email": "maria@exemplo.com", "telefone": "11 98888-7777"}
    fila = envelope([
        item_fila("IP0723371", 90, cidadao=cidadao),
        item_fila("maria@exemplo.com", 90, cidadao=cidadao),     # placa digitada errado pelo cidadão
        item_fila("IP0845512", 20, "ok", cidadao=cidadao),
        item_fila("IP0102030", 150, cidadao=cidadao),
    ])
    rodar(FakeCliente(fila=fila), saida)

    texto = arquivo_log.read_text(encoding="utf-8")
    assert "IP0723371" in texto  # a placa pode
    assert "@" not in texto
    for proibido in ("Maria", "Silva", "98888", "telefone", "cidadao"):
        assert proibido not in texto
    for arquivo in saida.glob("*.json"):
        assert "@" not in arquivo.read_text(encoding="utf-8")


def test_filtro_remove_email_que_escape_para_o_log(arquivo_log):
    import logging
    logging.getLogger("luzviva_rpa.qualquer").error("erro com contato joao@exemplo.com no texto")
    texto = arquivo_log.read_text(encoding="utf-8")
    assert "joao@exemplo.com" not in texto and "<email-removido>" in texto


def test_falha_api_cai_no_meio_da_fila_interrompe_fase(tmp_path):
    """Circuit breaker: após 3 falhas seguidas ao abrir, a fase fila para e o resumo ainda é gravado."""
    import requests
    import responses

    from luzviva_rpa.cliente import ApiCliente
    from luzviva_rpa.execucao import executar

    base = "http://api.teste"
    fila = {"view": "vw_mvp_fila_manutencao", "linhas": 6, "dados": [
        {"placa": f"IP000000{i}", "subprefeitura": "SE", "situacao": "apagada", "prioridade": 60,
         "chamado_aberto": None} for i in range(6)]}
    with responses.RequestsMock(assert_all_requests_are_fired=False) as mock:
        mock.get(f"{base}/api/fila", json=fila)
        mock.get(f"{base}/api/chamados", json={"linhas": 0, "dados": []})
        mock.get(f"{base}/api/luminarias", json={"linhas": 0, "dados": []})
        mock.post(f"{base}/api/chamados", body=requests.exceptions.ChunkedEncodingError("corte"))
        cliente = ApiCliente(base, tentativas=2, dormir=lambda s: None)
        resumo = executar(cliente, tmp_path)
    assert resumo["contagem"]["lidos"] == 3  # 3 itens falharam seguidos; os outros 3 ficam para depois
    assert resumo["contagem"]["falhas"] == 3
    assert list(tmp_path.glob("execucao_*.json"))
