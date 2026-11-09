"""Fixtures comuns: API falsa em memória, relógio fixo e log em pasta temporária."""

from __future__ import annotations

from datetime import datetime

import pytest

from luzviva_rpa.registro import configurar_logs, fechar_logs

AGORA = datetime(2026, 11, 10, 8, 0, 0)


def item_fila(placa="IP0723371", prioridade=90, situacao="apagada", subprefeitura="SE", **extra) -> dict:
    """Item no formato de vw_mvp_fila_manutencao (dados simulados)."""
    return {"id_luminaria": 1, "placa": placa, "endereco": "RUA SIMULADA", "subprefeitura": subprefeitura,
            "lat": -23.559, "lon": -46.635, "situacao": situacao, "ultimo_lux": 0.4,
            "ultima_medicao": "2026-11-09T19:24:10", "ocorrencias_app": 2, "chamado_aberto": None,
            "status_chamado": None, "confianca_visao": 0.91, "prioridade": prioridade, **extra}


def envelope(dados, view="vw_mvp_fila_manutencao") -> dict:
    return {"view": view, "gerado_em": "2026-11-10T06:00:00", "linhas": len(dados), "dados": dados}


def chamado(placa="IP0400001", aberto_em="2026-11-08T08:00:00", status="aberto",
            situacao="apagada", area="SE", **extra) -> dict:
    return {"id_chamado": f"CH-{aberto_em[:10].replace('-', '')}-{placa}", "placa": placa,
            "area_piloto": area, "prioridade": 60, "situacao_detectada": situacao, "status": status,
            "aberto_em": aberto_em, "atualizado_em": aberto_em, "concluido_em": None,
            "equipe": "EQUIPE-CENTRO", "origem": "rpa", **extra}


class FakeCliente:
    """Implementa a mesma interface de ApiCliente, sem rede."""

    def __init__(self, fila=None, chamados=None, luminarias=None, erros=None,
                 post_409=(), post_falha=()):
        self.fila = envelope([]) if fila is None else fila
        self.chamados = list(chamados or [])
        self.luminarias = envelope(list(luminarias or []), "vw_mvp_mapa_luminarias")
        self.erros = dict(erros or {})        # nome do método -> exceção a levantar
        self.post_409 = set(post_409)         # placas que recebem 409
        self.post_falha = dict.fromkeys(post_falha)  # placas cujo POST falha
        self.posts: list[dict] = []
        self.patches: list[tuple[str, dict]] = []

    def _falhar(self, metodo):
        if metodo in self.erros:
            raise self.erros[metodo]

    def obter_fila(self):
        self._falhar("obter_fila")
        return self.fila

    def obter_chamados_abertos(self):
        self._falhar("obter_chamados_abertos")
        return [c for c in self.chamados if c["status"] in ("aberto", "em_atendimento")]

    def obter_luminarias(self):
        self._falhar("obter_luminarias")
        return self.luminarias

    def abrir_chamado(self, novo):
        from luzviva_rpa.cliente import ApiIndisponivel
        if novo["placa"] in self.post_falha:
            raise ApiIndisponivel("POST", "/api/chamados", 4)
        if novo["placa"] in self.post_409:
            return False, {"detail": "já existe"}
        self.posts.append(novo)
        return True, novo

    def atualizar_chamado(self, id_chamado, campos):
        self._falhar("atualizar_chamado")
        self.patches.append((id_chamado, campos))
        return {"id_chamado": id_chamado, **campos}


@pytest.fixture
def arquivo_log(tmp_path):
    caminho = configurar_logs(tmp_path / "logs", AGORA, console=False)
    yield caminho
    fechar_logs()


@pytest.fixture
def saida(tmp_path):
    return tmp_path / "saida"
