"""Cliente HTTP da API do app LuzViva, com timeout e nova tentativa com espera exponencial."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any

import requests

from .config import ESPERA_BASE_S, TENTATIVAS, TIMEOUT_S

log = logging.getLogger(__name__)


class ErroApi(Exception):
    """Base de todos os erros de conversa com a API."""


class ErroHttp(ErroApi):
    """A API respondeu com um status de erro do pedido (4xx que não seja 409/429)."""

    def __init__(self, metodo: str, rota: str, status: int):
        super().__init__(f"{metodo} {rota} respondeu HTTP {status}")
        self.status = status


class ApiIndisponivel(ErroApi):
    """A API não respondeu (rede, timeout, 429 ou 5xx) depois de todas as tentativas."""

    def __init__(self, metodo: str, rota: str, tentativas: int):
        super().__init__(f"API indisponível após {tentativas} tentativas: {metodo} {rota}")


class RespostaInvalida(ErroApi):
    """A API respondeu 2xx, mas o corpo não é o JSON esperado."""

    def __init__(self, metodo: str, rota: str, motivo: str):
        super().__init__(f"resposta inválida em {metodo} {rota}: {motivo}")


class ApiCliente:
    """Fala com as rotas que o robô usa. Só sabe HTTP; as decisões ficam em `regras`."""

    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        *,
        timeout: float = TIMEOUT_S,
        tentativas: int = TENTATIVAS,
        espera_base: float = ESPERA_BASE_S,
        dormir: Callable[[float], None] = time.sleep,
        sessao: requests.Session | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.tentativas = tentativas
        self.espera_base = espera_base
        self.dormir = dormir
        self.sessao = sessao or requests.Session()
        self.sessao.headers["Accept"] = "application/json"
        if token:
            self.sessao.headers["X-API-Key"] = token

    # ---------- rotas ----------

    def obter_fila(self) -> Any:
        return self._json("GET", "/api/fila", self._requisitar("GET", "/api/fila"))

    def obter_luminarias(self) -> Any:
        return self._json("GET", "/api/luminarias", self._requisitar("GET", "/api/luminarias"))

    def obter_chamados_abertos(self) -> list[dict]:
        rota = "/api/chamados"
        resp = self._requisitar("GET", rota, params={"status": "aberto,em_atendimento"})
        corpo = self._json("GET", rota, resp)
        dados = corpo.get("dados") if isinstance(corpo, dict) else None
        if not isinstance(dados, list):
            raise RespostaInvalida("GET", rota, "campo 'dados' ausente ou não é lista")
        return [c for c in dados if isinstance(c, dict)]

    def abrir_chamado(self, chamado: dict) -> tuple[bool, Any]:
        """POST do chamado. Devolve (True, chamado) se criou; (False, corpo) se 409 (duplicado)."""
        rota = "/api/chamados"
        resp = self._requisitar("POST", rota, json=chamado, aceitar=(200, 201, 409))
        if resp.status_code == 409:
            return False, self._json_ou_vazio(resp)
        return True, self._json("POST", rota, resp)

    def atualizar_chamado(self, id_chamado: str, campos: dict) -> Any:
        rota = f"/api/chamados/{id_chamado}"
        return self._json("PATCH", rota, self._requisitar("PATCH", rota, json=campos))

    # ---------- infraestrutura ----------

    def _requisitar(self, metodo: str, rota: str, *, aceitar=(200, 201), **kwargs) -> requests.Response:
        url = f"{self.base_url}{rota}"
        for tentativa in range(1, self.tentativas + 1):
            try:
                resp = self.sessao.request(metodo, url, timeout=self.timeout, **kwargs)
            except requests.RequestException as exc:  # conexão, timeout, corpo truncado, redirecionamento...
                motivo = type(exc).__name__
            else:
                if resp.status_code in aceitar:
                    return resp
                if resp.status_code < 500 and resp.status_code != 429:
                    raise ErroHttp(metodo, rota, resp.status_code)  # erro do pedido: repetir não ajuda
                motivo = f"HTTP {resp.status_code}"
            log.warning("falha %s %s (tentativa %d/%d): %s", metodo, rota, tentativa, self.tentativas, motivo)
            if tentativa < self.tentativas:
                self.dormir(self.espera_base * 2 ** (tentativa - 1))
        raise ApiIndisponivel(metodo, rota, self.tentativas)

    @staticmethod
    def _json(metodo: str, rota: str, resp: requests.Response) -> Any:
        if not resp.content or not resp.content.strip():
            raise RespostaInvalida(metodo, rota, "corpo vazio")
        try:
            return resp.json()
        except ValueError as exc:
            raise RespostaInvalida(metodo, rota, "JSON inválido") from exc

    @staticmethod
    def _json_ou_vazio(resp: requests.Response) -> Any:
        try:
            return resp.json()
        except ValueError:
            return {}
