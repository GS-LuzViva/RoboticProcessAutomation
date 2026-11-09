"""Gerador das views simuladas: lê amostras/ (só leitura) e grava em tmp_path."""

import importlib.util
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("gerador", RAIZ / "scripts" / "gerar_views_simuladas.py")
gerador = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gerador)


def test_gera_views_do_contrato(tmp_path):
    views = gerador.gerar(RAIZ / "amostras", tmp_path)
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        "vw_mvp_fila_manutencao.json", "vw_mvp_mapa_luminarias.json", "vw_mvp_painel_subprefeitura.json"]

    mapa = views["vw_mvp_mapa_luminarias"]
    assert set(mapa) == {"view", "gerado_em", "linhas", "dados"}  # sem chave "simulado"
    assert list(mapa["dados"][0]) == ["id_luminaria", "placa", "endereco", "subprefeitura", "lat", "lon",
                                      "ultima_medicao", "ultimo_lux", "situacao", "ocorrencias_app"]
    for linha in mapa["dados"]:
        lux = linha["ultimo_lux"]
        esperado = "sem_medicao" if lux is None else "apagada" if lux < 1 else "insuficiente" if lux < 5 else "ok"
        assert linha["situacao"] == esperado

    fila = views["vw_mvp_fila_manutencao"]["dados"]
    assert fila and [f["prioridade"] for f in fila] == sorted((f["prioridade"] for f in fila), reverse=True)
    for f in fila:
        assert f["situacao"] in ("apagada", "insuficiente") or f["confianca_visao"] >= 0.8
        base = {"apagada": 60, "insuficiente": 30}.get(f["situacao"], 0)
        bonus = min(30, 10 * f["ocorrencias_app"]) + (10 if f["confianca_visao"] >= 0.8 else 0)
        assert f["prioridade"] == min(100, base + bonus)

    painel = views["vw_mvp_painel_subprefeitura"]["dados"]
    assert [p["subprefeitura"] for p in painel] == ["SE", "PINHEIROS", "CAMPO LIMPO"]
    assert painel[0]["luminarias_cadastradas"] == 17035  # total real de _coleta.pontos_por_area


def test_gerador_e_deterministico(tmp_path):
    gerador.gerar(RAIZ / "amostras", tmp_path / "a")
    gerador.gerar(RAIZ / "amostras", tmp_path / "b")
    for arquivo in (tmp_path / "a").iterdir():
        assert arquivo.read_bytes() == (tmp_path / "b" / arquivo.name).read_bytes()


def test_regras_de_limpeza():
    assert gerador.noturna("2026-11-09T19:00:00") and gerador.noturna("2026-11-09T05:59:00")
    assert not gerador.noturna("2026-11-09T12:00:00")
    assert not gerador.dentro_de_sp({"lat": -22.9, "lon": -46.7})
    assert not gerador.dentro_de_sp({"lat": None, "lon": -46.7})
    assert 13 < gerador.distancia_m(-23.5591, -46.6349, -23.5592, -46.6350) < 16
