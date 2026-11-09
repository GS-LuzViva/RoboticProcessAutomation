"""Modelos Pydantic das entradas da API (contratos 1 a 4 de docs/contrato_mvp_dados.md)."""

from datetime import datetime
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, PlainSerializer, StringConstraints

FUSO = ZoneInfo("America/Sao_Paulo")


def agora() -> datetime:
    """Horário de São Paulo, sem fuso e sem microssegundos (convenção da API)."""
    return datetime.now(FUSO).replace(tzinfo=None, microsecond=0)


def _horario_sp(valor: datetime) -> datetime:
    if valor.tzinfo is not None:
        valor = valor.astimezone(FUSO).replace(tzinfo=None)
    return valor.replace(microsecond=0)


DataHora = Annotated[
    datetime,
    AfterValidator(_horario_sp),
    PlainSerializer(lambda v: v.isoformat(timespec="seconds"), return_type=str),
]
Area = Literal["SE", "PINHEIROS", "CAMPO LIMPO"]
Placa = Annotated[str, StringConstraints(pattern=r"^IP\d{7}$")]
Lat = Annotated[float, Field(ge=-90, le=90)]
Lon = Annotated[float, Field(ge=-180, le=180)]
Categoria = Literal[
    "luminaria_apagada",
    "luminaria_acesa",
    "luminaria_acesa_de_dia",
    "luminaria_piscando",
    "poste_danificado",
    "fiacao_exposta",
]
StatusChamado = Literal["aberto", "em_atendimento", "concluido", "cancelado"]
Texto = Annotated[str, StringConstraints(min_length=1, max_length=64)]


class Base(BaseModel):
    # Campos fora do contrato são ignorados (não chegam aos arquivos do dia).
    model_config = ConfigDict(allow_inf_nan=False)


class Medicao(Base):
    """Contrato 1. lat/lon aceitam null: medição sem fix de GPS é descartada (ou ligada pela placa) no pipeline."""

    id_medicao: Texto
    robo_id: Texto
    data_hora: DataHora
    lat: Lat | None = None
    lon: Lon | None = None
    lux: float = Field(ge=0)
    situacao_robo: Texto | None = None
    placa: Placa | None = None
    sensor: Texto | None = None
    bateria_pct: int | None = Field(default=None, ge=0, le=100)
    area_piloto: Area


class Ocorrencia(Base):
    """Contrato 2. O campo `cidadao` não existe aqui de propósito: é descartado na entrada (LGPD)."""

    id_ocorrencia: Texto
    data_hora: DataHora
    categoria: Categoria
    origem: Literal["app_foto_cidadao", "camera_visao"]
    confianca_visao: float | None = Field(default=None, ge=0, le=1)
    modelo_visao: Texto | None = None
    foto_id: Texto
    lat: Lat
    lon: Lon
    area_piloto: Area
    placa: Placa | None = None


class ChamadoNovo(Base):
    """Contrato 3 (entrada do POST)."""

    id_chamado: Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{1,64}$")] | None = None
    placa: Placa
    area_piloto: Area
    prioridade: int = Field(ge=0, le=100)
    situacao_detectada: Literal["apagada", "insuficiente"]
    status: StatusChamado = "aberto"
    aberto_em: DataHora | None = None
    atualizado_em: DataHora | None = None
    concluido_em: DataHora | None = None
    equipe: Texto | None = None
    origem: Texto = "rpa"


class ChamadoAlteracao(Base):
    """Corpo do PATCH: só estes três campos."""

    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")

    status: StatusChamado | None = None
    equipe: Texto | None = None
    concluido_em: DataHora | None = None


class Pergunta(Base):
    """Contrato 4 (entrada)."""

    pergunta: str = Field(min_length=1, max_length=2000)
    placa: Placa | None = None
