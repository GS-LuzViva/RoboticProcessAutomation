"""Regras de negócio puras (decisão sobre item da fila e acompanhamento de chamado)."""

from datetime import timedelta

import pytest

from conftest import AGORA, chamado, item_fila
from luzviva_rpa import regras


def decidir(item, com_chamado=(), vistas=()):
    return regras.decidir_item(item, set(com_chamado), set(vistas)).acao


# ---------------------------------------------------------------- fila

def test_prioridade_no_corte_abre_chamado():
    assert decidir(item_fila(prioridade=30, situacao="insuficiente")) == "abrir"


def test_prioridade_abaixo_do_corte_vai_para_monitorar():
    assert decidir(item_fila(prioridade=29)) == "monitorar"


def test_situacao_ok_com_prioridade_alta_vai_para_monitorar():
    assert decidir(item_fila(prioridade=40, situacao="ok")) == "monitorar"


def test_placa_com_chamado_aberto_e_duplicado():
    assert decidir(item_fila(), com_chamado={"IP0723371"}) == "duplicado"


def test_campo_chamado_aberto_da_fila_e_duplicado():
    item = item_fila(chamado_aberto="CH-20261109-IP0723371", status_chamado="em_atendimento")
    assert decidir(item) == "duplicado"


def test_placa_repetida_na_mesma_fila_e_duplicado():
    assert decidir(item_fila(), vistas={"IP0723371"}) == "duplicado"


@pytest.mark.parametrize("prioridade", [150, -1, "alta", None, True, float("nan")])
def test_prioridade_invalida_e_invalido(prioridade):
    assert decidir(item_fila(prioridade=prioridade)) == "invalido"


@pytest.mark.parametrize("placa", [None, "", "IP123", "ip0723371", "XX0723371", "IP07233710"])
def test_placa_invalida_e_invalido(placa):
    assert decidir(item_fila(placa=placa)) == "invalido"


def test_area_fora_do_piloto_e_invalido():
    assert decidir(item_fila(subprefeitura="MOOCA")) == "invalido"


def test_item_que_nao_e_objeto_e_invalido():
    assert decidir("IP0723371") == "invalido"


def test_montar_chamado_segue_contrato_e_equipe_por_area():
    novo = regras.montar_chamado(item_fila(placa="IP0298167", subprefeitura="PINHEIROS", prioridade=80.0,
                                           cidadao={"nome": "Fulana", "email": "fulana@exemplo.com"}), AGORA)
    assert novo == {
        "id_chamado": "CH-20261110-IP0298167", "placa": "IP0298167", "area_piloto": "PINHEIROS",
        "prioridade": 80, "situacao_detectada": "apagada", "status": "aberto",
        "aberto_em": "2026-11-10T08:00:00", "atualizado_em": "2026-11-10T08:00:00",
        "concluido_em": None, "equipe": "EQUIPE-OESTE", "origem": "rpa",
    }


@pytest.mark.parametrize("area,equipe", [("SE", "EQUIPE-CENTRO"), ("PINHEIROS", "EQUIPE-OESTE"),
                                         ("CAMPO LIMPO", "EQUIPE-SUL")])
def test_equipe_por_area(area, equipe):
    assert regras.montar_chamado(item_fila(subprefeitura=area), AGORA)["equipe"] == equipe


@pytest.mark.parametrize("corpo", [None, [], "texto", {"view": "x"}, {"dados": {"a": 1}}])
def test_envelope_invalido(corpo):
    with pytest.raises(regras.EnvelopeInvalido):
        regras.validar_envelope(corpo)


# ---------------------------------------------------------------- acompanhamento

def _iso(delta):
    return (AGORA - delta).isoformat()


def test_aberto_ha_um_dia_vai_para_em_atendimento():
    d = regras.decidir_chamado(chamado(aberto_em=_iso(timedelta(days=1))), [], AGORA)
    assert (d.acao, d.escalar) == ("em_atendimento", False)


def test_aberto_ha_menos_de_um_dia_fica_como_esta():
    d = regras.decidir_chamado(chamado(aberto_em=_iso(timedelta(hours=23))), [], AGORA)
    assert (d.acao, d.escalar) == ("manter", False)


def test_apagada_escala_depois_de_5_dias():
    no_prazo = regras.decidir_chamado(chamado(aberto_em=_iso(timedelta(days=5)), status="em_atendimento"), [], AGORA)
    vencido = regras.decidir_chamado(chamado(aberto_em=_iso(timedelta(days=5, hours=1)), status="em_atendimento"), [], AGORA)
    assert (no_prazo.escalar, vencido.escalar, vencido.prazo_dias) == (False, True, 5)


def test_insuficiente_escala_so_depois_de_10_dias():
    ch = chamado(aberto_em=_iso(timedelta(days=7)), status="em_atendimento", situacao="insuficiente")
    assert regras.decidir_chamado(ch, [], AGORA).escalar is False
    ch = chamado(aberto_em=_iso(timedelta(days=11)), status="em_atendimento", situacao="insuficiente")
    d = regras.decidir_chamado(ch, [], AGORA)
    assert (d.escalar, d.prazo_dias) == (True, 10)


def test_aberto_e_vencido_muda_status_e_escala():
    d = regras.decidir_chamado(chamado(aberto_em=_iso(timedelta(days=6))), [], AGORA)
    assert (d.acao, d.escalar) == ("em_atendimento", True)


def test_conclui_com_medicao_ok_depois_da_abertura():
    lum = {"placa": "IP0400001", "situacao": "ok", "ultima_medicao": _iso(timedelta(hours=10))}
    d = regras.decidir_chamado(chamado(aberto_em=_iso(timedelta(days=6))), [lum], AGORA)
    assert (d.acao, d.escalar, d.concluido_em) == ("concluir", False, "2026-11-09T22:00:00")


def test_nao_conclui_com_medicao_ok_anterior_a_abertura():
    lum = {"placa": "IP0400001", "situacao": "ok", "ultima_medicao": _iso(timedelta(days=3))}
    d = regras.decidir_chamado(chamado(aberto_em=_iso(timedelta(days=2))), [lum], AGORA)
    assert d.acao == "em_atendimento"


def test_nao_conclui_se_outro_ponto_da_placa_segue_apagado():
    pontos = [{"situacao": "ok", "ultima_medicao": _iso(timedelta(hours=5))},
              {"situacao": "apagada", "ultima_medicao": _iso(timedelta(hours=5))}]
    d = regras.decidir_chamado(chamado(aberto_em=_iso(timedelta(days=2))), pontos, AGORA)
    assert d.acao == "em_atendimento"


def test_chamado_sem_aberto_em_e_inconsistente():
    with pytest.raises(regras.ChamadoInconsistente):
        regras.decidir_chamado(chamado(aberto_em="ontem"), [], AGORA)
