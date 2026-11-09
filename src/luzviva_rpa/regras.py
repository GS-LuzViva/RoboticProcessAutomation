"""Regras de negócio do robô, como funções puras (sem rede, sem disco, sem relógio).

Fonte: `luzviva-app/docs/especificacao_api.md`, seção "Regras do RPA".
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import datetime

from .config import (
    CORTE_PRIORIDADE,
    DIAS_PARA_ATENDIMENTO,
    EQUIPE_POR_AREA,
    PRAZO_REPARO_DIAS,
    REGEX_PLACA,
    SITUACOES_QUE_ABREM,
    ler_data,
)

_PLACA = re.compile(REGEX_PLACA)
STATUS_EM_ABERTO = ("aberto", "em_atendimento")


class EnvelopeInvalido(Exception):
    """O envelope de uma view (fila ou luminárias) não tem o formato do contrato."""


class ChamadoInconsistente(Exception):
    """Chamado devolvido pela API sem campos mínimos para decidir (ex.: aberto_em inválido)."""


@dataclass(frozen=True)
class DecisaoItem:
    acao: str  # abrir | monitorar | duplicado | invalido
    motivo: str


@dataclass(frozen=True)
class DecisaoChamado:
    acao: str  # concluir | em_atendimento | manter
    escalar: bool
    dias_em_aberto: float
    prazo_dias: int
    motivo: str
    concluido_em: str | None = None


# ---------------------------------------------------------------- fila

def validar_envelope(corpo: object) -> list:
    """Devolve a lista `dados` do envelope ou levanta EnvelopeInvalido."""
    if not isinstance(corpo, dict):
        raise EnvelopeInvalido("corpo não é um objeto JSON")
    dados = corpo.get("dados")
    if dados is None:
        raise EnvelopeInvalido("campo 'dados' ausente")
    if not isinstance(dados, list):
        raise EnvelopeInvalido("campo 'dados' não é uma lista")
    return dados


def placa_valida(placa: object) -> bool:
    return isinstance(placa, str) and bool(_PLACA.match(placa))


def placa_para_log(item: object) -> str:
    """Só a placa vai para o log, e só se tiver o formato ILUME (nada digitado por cidadão)."""
    placa = item.get("placa") if isinstance(item, dict) else None
    return placa if placa_valida(placa) else "<invalida>"


def _prioridade_valida(prioridade: object) -> bool:
    return (
        isinstance(prioridade, (int, float))
        and not isinstance(prioridade, bool)
        and math.isfinite(prioridade)
        and 0 <= prioridade <= 100
    )


def validar_item(item: object) -> str | None:
    """Motivo pelo qual o item é inválido, ou None se ele pode ser decidido."""
    if not isinstance(item, dict):
        return "item não é um objeto"
    placa = item.get("placa")
    if not placa:
        return "placa ausente"
    if not placa_valida(placa):
        return f"placa fora do padrão {REGEX_PLACA}"
    if not _prioridade_valida(item.get("prioridade")):
        return "prioridade ausente, não numérica ou fora de 0..100"
    if item.get("subprefeitura") not in EQUIPE_POR_AREA:
        return "subprefeitura fora das áreas-piloto"
    return None


def tem_chamado_aberto(item: dict, placas_com_chamado: set[str]) -> bool:
    return (
        item["placa"] in placas_com_chamado
        or bool(item.get("chamado_aberto"))
        or item.get("status_chamado") in STATUS_EM_ABERTO
    )


def decidir_item(item: object, placas_com_chamado: set[str], placas_vistas: set[str]) -> DecisaoItem:
    """Decide o que fazer com um item da fila. Não altera os conjuntos recebidos."""
    motivo = validar_item(item)
    if motivo:
        return DecisaoItem("invalido", motivo)
    if item["placa"] in placas_vistas:
        return DecisaoItem("duplicado", "placa repetida na mesma fila")
    if item["prioridade"] < CORTE_PRIORIDADE:
        return DecisaoItem("monitorar", f"prioridade abaixo do corte {CORTE_PRIORIDADE}")
    if item.get("situacao") not in SITUACOES_QUE_ABREM:
        return DecisaoItem("monitorar", "situação não é apagada nem insuficiente")
    if tem_chamado_aberto(item, placas_com_chamado):
        return DecisaoItem("duplicado", "placa já tem chamado aberto ou em atendimento")
    return DecisaoItem("abrir", f"prioridade >= {CORTE_PRIORIDADE} e sem chamado aberto")


def montar_chamado(item: dict, agora: datetime) -> dict:
    """Chamado no formato do contrato 3. Só campos do contrato: nada do item é copiado além disso."""
    area = item["subprefeitura"]
    momento = agora.replace(microsecond=0).isoformat()
    return {
        "id_chamado": f"CH-{agora:%Y%m%d}-{item['placa']}",
        "placa": item["placa"],
        "area_piloto": area,
        "prioridade": int(round(item["prioridade"])),
        "situacao_detectada": item["situacao"],
        "status": "aberto",
        "aberto_em": momento,
        "atualizado_em": momento,
        "concluido_em": None,
        "equipe": EQUIPE_POR_AREA[area],
        "origem": "rpa",
    }


def placas_com_chamado(chamados: list[dict]) -> set[str]:
    return {c["placa"] for c in chamados if c.get("placa") and c.get("status") in STATUS_EM_ABERTO}


# ---------------------------------------------------------------- acompanhamento

def prazo_do_chamado(chamado: dict) -> int:
    """Prazo de reparo pela situação detectada; situação desconhecida usa o prazo mais curto."""
    return PRAZO_REPARO_DIAS.get(chamado.get("situacao_detectada"), min(PRAZO_REPARO_DIAS.values()))


def reparo_confirmado(luminarias: list[dict], aberto_em: datetime) -> datetime | None:
    """Momento da medição que confirma o reparo, ou None.

    Regra da especificação: `situacao == "ok"` com `ultima_medicao > aberto_em`. Como uma placa pode
    ter mais de um ponto de luz, exigimos também que nenhum ponto da placa siga com falha.
    """
    if any(lum.get("situacao") in SITUACOES_QUE_ABREM for lum in luminarias):
        return None
    medicoes = [
        m for lum in luminarias if lum.get("situacao") == "ok"
        and (m := ler_data(lum.get("ultima_medicao"))) is not None and m > aberto_em
    ]
    return max(medicoes) if medicoes else None


def decidir_chamado(chamado: dict, luminarias: list[dict], agora: datetime) -> DecisaoChamado:
    """Decide o acompanhamento de um chamado aberto ou em atendimento.

    `luminarias` são os pontos de luz da placa do chamado em GET /api/luminarias (pode ser vazia).
    """
    aberto_em = ler_data(chamado.get("aberto_em"))
    if aberto_em is None or not chamado.get("id_chamado"):
        raise ChamadoInconsistente("chamado sem id_chamado ou com aberto_em inválido")
    dias = (agora - aberto_em).total_seconds() / 86400
    prazo = prazo_do_chamado(chamado)

    confirmado = reparo_confirmado(luminarias, aberto_em)
    if confirmado is not None:
        return DecisaoChamado("concluir", False, dias, prazo, "medição ok depois da abertura",
                              confirmado.isoformat())

    escalar = dias > prazo
    if chamado.get("status") == "aberto" and dias >= DIAS_PARA_ATENDIMENTO:
        return DecisaoChamado("em_atendimento", escalar, dias, prazo,
                              f"aberto há {DIAS_PARA_ATENDIMENTO} dia ou mais")
    return DecisaoChamado("manter", escalar, dias, prazo, "dentro do fluxo")
