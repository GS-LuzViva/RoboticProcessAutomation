"""Linha de comando: configuração ausente e falha real de conexão (nada escutando na porta)."""

import json

from luzviva_rpa.__main__ import main
from luzviva_rpa.registro import fechar_logs


def _ambiente(monkeypatch, tmp_path, **valores):
    for nome in ("LUZVIVA_API_URL", "LUZVIVA_API_TOKEN"):
        monkeypatch.delenv(nome, raising=False)
    monkeypatch.setenv("LUZVIVA_RPA_DIR_LOGS", str(tmp_path / "logs"))
    monkeypatch.setenv("LUZVIVA_RPA_DIR_SAIDA", str(tmp_path / "saida"))
    for nome, valor in valores.items():
        monkeypatch.setenv(nome, valor)


def _log(tmp_path):
    fechar_logs()
    return next((tmp_path / "logs").glob("rpa_*.log")).read_text(encoding="utf-8")


def test_sem_url_da_api_sai_com_codigo_2(monkeypatch, tmp_path):
    _ambiente(monkeypatch, tmp_path)
    assert main([]) == 2
    assert "configuração inválida: variável LUZVIVA_API_URL não definida" in _log(tmp_path)


def test_api_desligada_simular_registra_erro_e_sai_com_codigo_1(monkeypatch, tmp_path):
    _ambiente(monkeypatch, tmp_path, LUZVIVA_API_URL="http://127.0.0.1:9", LUZVIVA_RPA_ESPERA_BASE="0")
    assert main(["--simular"]) == 1
    texto = _log(tmp_path)
    assert texto.count("falha GET /api/fila (tentativa") == 4
    assert "fase fila abortada: API indisponível após 4 tentativas" in texto
    resumo = json.loads(next((tmp_path / "saida").glob("execucao_*.json")).read_text(encoding="utf-8"))
    assert resumo["simulacao"] is True and len(resumo["erros"]) == 2
