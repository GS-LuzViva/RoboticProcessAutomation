"""API simulada do app LuzViva, só com a biblioteca padrão, para testes e demonstração.

Implementa as rotas que o robô usa, com o comportamento da especificação
(`luzviva-app/docs/especificacao_api.md`): GET /api/fila, GET /api/luminarias,
GET /api/chamados?status=, POST /api/chamados (201 ou 409) e PATCH /api/chamados/{id}.

Os dados são SIMULADOS (placas no formato ILUME, sem nenhum dado pessoal) e montados em relação
ao momento em que o servidor sobe, para que cada regra do robô apareça numa execução:
abrir, monitorar, duplicado (na fila e com chamado aberto), inválido, em_atendimento,
escalonamento e conclusão. Quando a API real do app estiver no ar, aponte o robô para ela.

Uso: python tests/api_simulada.py --porta 8799
"""

from __future__ import annotations

import argparse
import json
import logging
import threading
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from zoneinfo import ZoneInfo

log = logging.getLogger("api_simulada")
FUSO = ZoneInfo("America/Sao_Paulo")
TRANSICOES = {"aberto": {"em_atendimento", "concluido", "cancelado"},
              "em_atendimento": {"concluido", "cancelado"}}


def _iso(data: datetime) -> str:
    return data.replace(microsecond=0).isoformat()


def dados_iniciais(agora: datetime) -> dict:
    """Fila, luminárias e chamados simulados, relativos a `agora`."""
    def lum(id_, placa, sub, situacao, lux, medicao, ocorrencias=0):
        return {"id_luminaria": id_, "placa": placa, "endereco": "LOGRADOURO SIMULADO",
                "subprefeitura": sub, "lat": -23.56, "lon": -46.64, "situacao": situacao,
                "ultimo_lux": lux, "ultima_medicao": medicao and _iso(medicao),
                "ocorrencias_app": ocorrencias}

    ontem = agora - timedelta(days=1)
    luminarias = [
        lum(1, "IP0723371", "SE", "apagada", 0.4, ontem, 2),
        lum(2, "IP0723371", "SE", "apagada", 0.6, ontem, 0),          # 2o ponto da mesma placa
        lum(3, "IP0298167", "PINHEIROS", "apagada", 0.2, ontem, 1),
        lum(4, "IP0511204", "CAMPO LIMPO", "apagada", 0.3, ontem, 1),
        lum(5, "IP0634410", "CAMPO LIMPO", "insuficiente", 3.1, ontem, 1),
        lum(6, "IP0102030", "PINHEIROS", "insuficiente", 2.5, ontem, 0),
        lum(7, "IP0845512", "SE", "ok", 18.0, ontem, 2),
        lum(8, "IP0400001", "PINHEIROS", "insuficiente", 4.0, ontem, 0),
        lum(9, "IP0300003", "SE", "ok", 21.5, ontem, 0),               # consertada
    ]
    prioridades = {1: 90, 2: 60, 3: 80, 4: 70, 5: 40, 6: 150, 7: 20}  # 150: dado inconsistente
    fila = []
    for ponto in luminarias:
        if ponto["id_luminaria"] in prioridades:
            fila.append({**ponto, "chamado_aberto": None, "status_chamado": None,
                         "confianca_visao": 0.91 if ponto["ocorrencias_app"] else None,
                         "prioridade": prioridades[ponto["id_luminaria"]]})
    fila.append({"id_luminaria": 10, "placa": "XX123", "subprefeitura": "SE", "situacao": "apagada",
                 "prioridade": 60})                                     # placa fora do padrão
    fila.sort(key=lambda i: i["prioridade"], reverse=True)

    def chamado(dias, placa, area, situacao, status, prioridade):
        aberto = agora - timedelta(days=dias)
        return {"id_chamado": f"CH-{aberto:%Y%m%d}-{placa}", "placa": placa, "area_piloto": area,
                "prioridade": prioridade, "situacao_detectada": situacao, "status": status,
                "aberto_em": _iso(aberto), "atualizado_em": _iso(aberto), "concluido_em": None,
                "equipe": None, "origem": "rpa"}

    chamados = [
        chamado(2, "IP0400001", "PINHEIROS", "insuficiente", "aberto", 30),        # → em_atendimento
        chamado(7, "IP0511204", "CAMPO LIMPO", "apagada", "em_atendimento", 70),   # → escala (prazo 5)
        chamado(3, "IP0300003", "SE", "apagada", "em_atendimento", 60),            # → conclui
    ]
    chamados[1]["equipe"] = "EQUIPE-SUL"
    chamados[2]["equipe"] = "EQUIPE-CENTRO"
    return {"fila": fila, "luminarias": luminarias, "chamados": {c["id_chamado"]: c for c in chamados}}


class EstadoApi:
    def __init__(self, agora: datetime | None = None, token: str | None = None):
        self.agora = agora or datetime.now(FUSO).replace(tzinfo=None)
        self.token = token
        self.lock = threading.Lock()
        self.dados = dados_iniciais(self.agora)
        self.posts: list[dict] = []
        self.patches: list[tuple[str, dict]] = []

    def aberto_da_placa(self, placa: str) -> dict | None:
        return next((c for c in self.dados["chamados"].values()
                     if c["placa"] == placa and c["status"] in ("aberto", "em_atendimento")), None)


def _criar_handler(estado: EstadoApi):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, formato, *args):  # silencia o log padrão em stderr
            log.debug(formato, *args)

        def _responder(self, status: int, corpo: object) -> None:
            dados = json.dumps(corpo, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)

        def _corpo(self) -> dict:
            tamanho = int(self.headers.get("Content-Length") or 0)
            return json.loads(self.rfile.read(tamanho) or b"{}")

        def _autorizado(self) -> bool:
            if estado.token and self.headers.get("X-API-Key") != estado.token:
                self._responder(401, {"detail": "X-API-Key ausente ou inválida"})
                return False
            return True

        def do_GET(self):
            url = urlparse(self.path)
            gerado = _iso(estado.agora)
            with estado.lock:
                if url.path == "/api/fila":
                    dados = []
                    for item in estado.dados["fila"]:
                        aberto = estado.aberto_da_placa(item.get("placa", ""))
                        dados.append({**item, "chamado_aberto": aberto and aberto["id_chamado"],
                                      "status_chamado": aberto and aberto["status"]})
                    self._responder(200, {"view": "vw_mvp_fila_manutencao", "gerado_em": gerado,
                                          "linhas": len(dados), "dados": dados})
                elif url.path == "/api/luminarias":
                    dados = estado.dados["luminarias"]
                    self._responder(200, {"view": "vw_mvp_mapa_luminarias", "gerado_em": gerado,
                                          "linhas": len(dados), "dados": dados})
                elif url.path == "/api/chamados":
                    filtro = parse_qs(url.query).get("status", [""])[0]
                    status = set(filtro.split(",")) if filtro else None
                    dados = [c for c in estado.dados["chamados"].values()
                             if status is None or c["status"] in status]
                    dados.sort(key=lambda c: (-c["prioridade"], c["aberto_em"]))
                    self._responder(200, {"linhas": len(dados), "dados": dados})
                else:
                    self._responder(404, {"detail": "rota não encontrada"})

        def do_POST(self):
            if urlparse(self.path).path != "/api/chamados":
                return self._responder(404, {"detail": "rota não encontrada"})
            if not self._autorizado():
                return
            corpo = self._corpo()
            with estado.lock:
                existente = estado.aberto_da_placa(corpo.get("placa", ""))
                if existente:
                    return self._responder(409, {"detail": existente["id_chamado"]})
                if corpo.get("id_chamado") in estado.dados["chamados"]:
                    return self._responder(409, {"detail": corpo["id_chamado"]})
                estado.dados["chamados"][corpo["id_chamado"]] = corpo
                estado.posts.append(corpo)
            self._responder(201, corpo)

        def do_PATCH(self):
            partes = urlparse(self.path).path.split("/")
            if len(partes) != 4 or partes[1:3] != ["api", "chamados"]:
                return self._responder(404, {"detail": "rota não encontrada"})
            if not self._autorizado():
                return
            corpo = self._corpo()
            with estado.lock:
                chamado = estado.dados["chamados"].get(partes[3])
                if chamado is None:
                    return self._responder(404, {"detail": "chamado não encontrado"})
                novo = corpo.get("status", chamado["status"])
                if novo != chamado["status"] and novo not in TRANSICOES.get(chamado["status"], set()):
                    return self._responder(409, {"detail": "transição inválida"})
                chamado.update({k: v for k, v in corpo.items() if k in ("status", "equipe", "concluido_em")})
                chamado["atualizado_em"] = _iso(estado.agora)
                estado.patches.append((partes[3], corpo))
            self._responder(200, chamado)

    return Handler


class _Servidor(ThreadingHTTPServer):
    allow_reuse_address = False  # no Windows, reuso deixaria dois servidores na mesma porta


def criar_servidor(porta: int = 0, estado: EstadoApi | None = None) -> tuple[ThreadingHTTPServer, EstadoApi]:
    estado = estado or EstadoApi()
    return _Servidor(("127.0.0.1", porta), _criar_handler(estado)), estado


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="API simulada do LuzViva para o robô de RPA")
    parser.add_argument("--porta", type=int, default=8799)
    parser.add_argument("--token", default=None, help="exige este X-API-Key em POST/PATCH")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    servidor, _ = criar_servidor(args.porta, EstadoApi(token=args.token))
    log.info("API simulada em http://127.0.0.1:%d (Ctrl+C para parar)", args.porta)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        log.info("encerrada")
