"""Arquivos do dia: dados_dia/<fonte>/<fonte>_AAAA-MM-DD.json no envelope do contrato."""

import json
import threading
from datetime import date
from pathlib import Path

from app.modelos import agora

FONTES = ("medicoes_robo", "ocorrencias_app", "chamados_rpa")

_trava = threading.Lock()


def caminho(dia: Path, fonte: str, data: date) -> Path:
    return dia / fonte / f"{fonte}_{data.isoformat()}.json"


def ler(arquivo: Path) -> dict:
    with _trava:
        return json.loads(arquivo.read_text(encoding="utf-8"))


def _envelope(arquivo: Path, fonte: str, data: date) -> dict:
    if arquivo.exists():
        return json.loads(arquivo.read_text(encoding="utf-8"))
    return {"_coleta": {"fonte": fonte, "data_coleta": data.isoformat(), "url": "app://luzviva"}, "dados": []}


def _gravar(arquivo: Path, envelope: dict) -> None:
    """Escrita atômica: arquivo temporário + replace."""
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    temporario = arquivo.with_name(arquivo.name + ".tmp")
    temporario.write_text(json.dumps(envelope, ensure_ascii=False, indent=1), encoding="utf-8")
    temporario.replace(arquivo)


def anexar(dia: Path, fonte: str, chave: str, registro: dict) -> bool:
    """Acrescenta o registro no arquivo de hoje. Devolve False se a chave já estava lá."""
    data = agora().date()
    arquivo = caminho(dia, fonte, data)
    with _trava:
        envelope = _envelope(arquivo, fonte, data)
        if any(r.get(chave) == registro[chave] for r in envelope["dados"]):
            return False
        envelope["dados"].append(registro)
        _gravar(arquivo, envelope)
        return True


def substituir(dia: Path, fonte: str, chave: str, registro: dict) -> None:
    """Upsert pela chave no arquivo de hoje (usado pelos chamados)."""
    data = agora().date()
    arquivo = caminho(dia, fonte, data)
    with _trava:
        envelope = _envelope(arquivo, fonte, data)
        outros = [r for r in envelope["dados"] if r.get(chave) != registro[chave]]
        envelope["dados"] = outros + [registro]
        _gravar(arquivo, envelope)
