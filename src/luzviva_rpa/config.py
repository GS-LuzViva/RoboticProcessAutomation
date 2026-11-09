"""Configuração do robô: tudo que muda por ambiente vem de variável de ambiente.

As regras de negócio (corte, prazos, equipes) são constantes fixadas em
`luzviva-app/docs/especificacao_api.md`, seção "Regras do RPA".
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

FUSO = ZoneInfo("America/Sao_Paulo")

# Regras do RPA (especificação da API)
CORTE_PRIORIDADE = 30
PRAZO_REPARO_DIAS = {"apagada": 5, "insuficiente": 10}
DIAS_PARA_ATENDIMENTO = 1
EQUIPE_POR_AREA = {
    "SE": "EQUIPE-CENTRO",
    "PINHEIROS": "EQUIPE-OESTE",
    "CAMPO LIMPO": "EQUIPE-SUL",
}
SITUACOES_QUE_ABREM = ("apagada", "insuficiente")
REGEX_PLACA = r"^IP\d{7}$"

# Resiliência na chamada à API
TIMEOUT_S = 20
TENTATIVAS = 4
ESPERA_BASE_S = 2.0  # esperas entre tentativas: 2, 4, 8 s

INTERVALO_PADRAO_S = 3600  # agendamento de hora em hora


class ConfiguracaoInvalida(Exception):
    """Falta variável de ambiente obrigatória ou ela tem valor inválido."""


@dataclass(frozen=True)
class Config:
    api_url: str
    api_token: str | None
    dir_logs: Path
    dir_saida: Path
    espera_base_s: float = ESPERA_BASE_S

    @classmethod
    def do_ambiente(cls, ambiente: dict[str, str] | None = None) -> "Config":
        amb = os.environ if ambiente is None else ambiente
        url = (amb.get("LUZVIVA_API_URL") or "").strip().rstrip("/")
        if not url:
            raise ConfiguracaoInvalida("variável LUZVIVA_API_URL não definida")
        if not url.startswith(("http://", "https://")):
            raise ConfiguracaoInvalida("LUZVIVA_API_URL deve começar com http:// ou https://")
        espera = amb.get("LUZVIVA_RPA_ESPERA_BASE") or str(ESPERA_BASE_S)
        try:
            espera_base = float(espera)
        except ValueError as exc:
            raise ConfiguracaoInvalida("LUZVIVA_RPA_ESPERA_BASE deve ser um número") from exc
        return cls(
            api_url=url,
            api_token=(amb.get("LUZVIVA_API_TOKEN") or "").strip() or None,
            dir_logs=Path(amb.get("LUZVIVA_RPA_DIR_LOGS") or "logs"),
            dir_saida=Path(amb.get("LUZVIVA_RPA_DIR_SAIDA") or "saida"),
            espera_base_s=max(espera_base, 0.0),
        )


def agora() -> datetime:
    """Hora atual em São Paulo, sem fuso (formato dos contratos)."""
    return datetime.now(FUSO).replace(tzinfo=None, microsecond=0)


def ler_data(valor: object) -> datetime | None:
    """Converte texto ISO 8601 em datetime ingênuo no horário de São Paulo; None se inválido."""
    if not isinstance(valor, str) or not valor:
        return None
    try:
        data = datetime.fromisoformat(valor)
    except ValueError:
        return None
    if data.tzinfo is not None:
        data = data.astimezone(FUSO).replace(tzinfo=None)
    return data
