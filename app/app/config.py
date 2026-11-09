"""Configuração do app, lida só de variáveis de ambiente (ver docs/especificacao_api.md)."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Config:
    data: Path  # views do pipeline (somente leitura)
    dia: Path  # arquivos do dia (medições, ocorrências, chamados)
    db: Path  # SQLite com o estado atual dos chamados
    fotos: Path  # fotos do cidadão já sem EXIF
    api_token: str
    cors: list[str]
    ia_url: str
    visao_url: str


def carregar() -> Config:
    def env(nome: str, padrao: str = "") -> str:
        return os.getenv(nome, "").strip() or padrao

    return Config(
        data=Path(env("LUZVIVA_DATA", "data")),
        dia=Path(env("LUZVIVA_DIA", "dados_dia")),
        db=Path(env("LUZVIVA_DB", "dados_dia/luzviva.db")),
        fotos=Path(env("LUZVIVA_FOTOS", "fotos")),
        api_token=env("LUZVIVA_API_TOKEN"),
        cors=[o.strip() for o in env("LUZVIVA_CORS").split(",") if o.strip()],
        ia_url=env("IA_URL").rstrip("/"),
        visao_url=env("VISAO_URL").rstrip("/"),
    )
