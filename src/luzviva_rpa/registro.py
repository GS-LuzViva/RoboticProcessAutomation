"""Log do robô: arquivo `logs/rpa_AAAA-MM-DD.log` (horário de São Paulo) e console.

Defesa em profundidade para a LGPD: o código só registra placa, id_chamado, prioridade, status e
contagens; mesmo assim, um filtro troca qualquer e-mail que escape por `<email-removido>`.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from pathlib import Path

from .config import FUSO, agora

NOME_LOGGER = "luzviva_rpa"
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")


class FiltroDadosSensiveis(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        mensagem = record.getMessage()
        if "@" in mensagem:
            record.msg, record.args = _EMAIL.sub("<email-removido>", mensagem), ()
        return True


def _formatador() -> logging.Formatter:
    fmt = logging.Formatter("%(asctime)s | %(levelname)-7s | %(message)s", "%Y-%m-%d %H:%M:%S")
    fmt.converter = lambda segundos: datetime.fromtimestamp(segundos, FUSO).timetuple()
    return fmt


def configurar_logs(dir_logs: Path, data: datetime | None = None, console: bool = True) -> Path:
    """(Re)configura o logger do robô e devolve o caminho do arquivo do dia."""
    dir_logs.mkdir(parents=True, exist_ok=True)
    arquivo = dir_logs / f"rpa_{(data or agora()):%Y-%m-%d}.log"
    logger = logging.getLogger(NOME_LOGGER)
    for antigo in list(logger.handlers):
        logger.removeHandler(antigo)
        antigo.close()
    handlers: list[logging.Handler] = [logging.FileHandler(arquivo, encoding="utf-8")]
    if console:
        handlers.append(logging.StreamHandler())
    for handler in handlers:
        handler.setFormatter(_formatador())
        handler.addFilter(FiltroDadosSensiveis())
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return arquivo


def fechar_logs() -> None:
    logger = logging.getLogger(NOME_LOGGER)
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()
