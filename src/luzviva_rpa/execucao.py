"""Orquestração de uma execução do robô: fila → abertura de chamados → acompanhamento → resumo."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from . import regras
from .cliente import ApiCliente, ApiIndisponivel, ErroApi
from .config import EQUIPE_POR_AREA, agora

log = logging.getLogger(__name__)

CONTADORES = (
    "lidos", "abertos", "monitorar", "duplicados", "invalidos",
    "em_atendimento", "escalados", "concluidos", "falhas",
)
FALHAS_SEGUIDAS_PARA_ABORTAR = 3  # API fora no meio da fila: para e deixa para a próxima hora
_CONTADOR_DA_ACAO = {"monitorar": "monitorar", "duplicado": "duplicados"}


class Execucao:
    """Estado de uma execução: contagens, erros de fase e escalonamentos."""

    def __init__(self, cliente: ApiCliente, momento: datetime, simular: bool):
        self.cliente = cliente
        self.agora = momento
        self.simular = simular
        self.contagem = dict.fromkeys(CONTADORES, 0)
        self.erros: list[str] = []
        self.escalonamentos: list[dict] = []

    # ------------------------------------------------------------ fase 1: fila

    def processar_fila(self) -> None:
        try:
            corpo = self.cliente.obter_fila()
            itens = regras.validar_envelope(corpo)
        except (ErroApi, regras.EnvelopeInvalido) as exc:
            self._erro_de_fase("fila", exc)
            return
        log.info("fila lida: %d itens", len(itens))
        if corpo.get("linhas") not in (None, len(itens)):
            log.warning("fila inconsistente: linhas=%s, mas dados tem %d itens; processo o que veio",
                        corpo.get("linhas"), len(itens))
        if not itens:
            log.warning("fila vazia: nenhum item para processar")
            return

        try:
            com_chamado = regras.placas_com_chamado(self.cliente.obter_chamados_abertos())
        except ErroApi as exc:
            log.warning("não consegui ler os chamados abertos (%s); sigo com o campo chamado_aberto "
                        "da fila e com o 409 da API como proteção contra duplicado", exc)
            com_chamado = set()

        vistas: set[str] = set()
        self._falhas_seguidas = 0
        for posicao, item in enumerate(itens, start=1):  # repetição sobre a fila
            if self._falhas_seguidas >= FALHAS_SEGUIDAS_PARA_ABORTAR:
                # API caiu no meio da fila: não gasta ~94 s por item; a próxima execução retoma.
                log.error("fase fila interrompida: %d falhas seguidas ao abrir chamados; %d itens "
                          "ficam para a próxima execução", self._falhas_seguidas, len(itens) - posicao + 1)
                break
            self.contagem["lidos"] += 1
            decisao = regras.decidir_item(item, com_chamado, vistas)  # decisão
            placa = regras.placa_para_log(item)
            if decisao.acao == "invalido":
                self.contagem["invalidos"] += 1
                log.warning("item inválido posicao=%d placa=%s motivo=%s", posicao, placa, decisao.motivo)
                continue
            vistas.add(item["placa"])
            if decisao.acao == "abrir":
                if self._abrir(item):
                    com_chamado.add(item["placa"])
            else:
                self.contagem[_CONTADOR_DA_ACAO[decisao.acao]] += 1
                log.info("%s placa=%s prioridade=%s motivo=%s",
                         decisao.acao, placa, item.get("prioridade"), decisao.motivo)

    def _abrir(self, item: dict) -> bool:
        """Abre o chamado. True se a placa passou a ter chamado (criado agora ou já existente)."""
        chamado = regras.montar_chamado(item, self.agora)
        ref = f"id={chamado['id_chamado']} placa={chamado['placa']} prioridade={chamado['prioridade']}"
        if self.simular:
            self.contagem["abertos"] += 1
            log.info("[simulação] abriria chamado %s equipe=%s", ref, chamado["equipe"])
            return True
        try:
            criado, _ = self.cliente.abrir_chamado(chamado)
        except ErroApi as exc:
            self.contagem["falhas"] += 1
            if isinstance(exc, ApiIndisponivel):
                self._falhas_seguidas += 1
            log.error("falha ao abrir chamado %s: %s", ref, exc)
            return False
        self._falhas_seguidas = 0
        if not criado:
            self.contagem["duplicados"] += 1
            log.info("duplicado placa=%s motivo=API respondeu 409 (chamado já existe)", chamado["placa"])
            return True
        self.contagem["abertos"] += 1
        log.info("chamado aberto %s equipe=%s", ref, chamado["equipe"])
        return True

    # ------------------------------------------------------------ fase 2: acompanhamento

    def acompanhar_chamados(self) -> None:
        try:
            chamados = self.cliente.obter_chamados_abertos()
        except ErroApi as exc:
            self._erro_de_fase("chamados", exc)
            return
        try:
            luminarias = regras.validar_envelope(self.cliente.obter_luminarias())
        except (ErroApi, regras.EnvelopeInvalido) as exc:
            log.warning("não consegui ler as luminárias (%s); nenhum chamado será concluído nesta "
                        "execução", exc)
            luminarias = []
        por_placa: dict[str, list[dict]] = {}
        for lum in luminarias:
            if isinstance(lum, dict) and lum.get("placa"):
                por_placa.setdefault(lum["placa"], []).append(lum)
        log.info("acompanhamento: %d chamados abertos ou em atendimento", len(chamados))

        for chamado in chamados:  # repetição sobre os chamados
            try:
                decisao = regras.decidir_chamado(chamado, por_placa.get(chamado.get("placa"), []),
                                                 self.agora)
            except regras.ChamadoInconsistente as exc:
                self.contagem["falhas"] += 1
                log.warning("chamado inconsistente id=%s: %s", chamado.get("id_chamado"), exc)
                continue
            if decisao.escalar:  # alerta local: sai mesmo se o PATCH abaixo falhar
                self._escalar(chamado, decisao)
            if decisao.acao == "concluir":
                self._atualizar(chamado, {"status": "concluido", "concluido_em": decisao.concluido_em},
                                "concluidos", decisao)
            elif decisao.acao == "em_atendimento":
                campos = {"status": "em_atendimento"}
                if not chamado.get("equipe") and chamado.get("area_piloto") in EQUIPE_POR_AREA:
                    campos["equipe"] = EQUIPE_POR_AREA[chamado["area_piloto"]]
                self._atualizar(chamado, campos, "em_atendimento", decisao)

    def _atualizar(self, chamado: dict, campos: dict, contador: str,
                   decisao: regras.DecisaoChamado) -> None:
        ref = f"id={chamado['id_chamado']} placa={chamado.get('placa')} status={campos['status']}"
        if self.simular:
            self.contagem[contador] += 1
            log.info("[simulação] atualizaria chamado %s motivo=%s", ref, decisao.motivo)
            return
        try:
            self.cliente.atualizar_chamado(chamado["id_chamado"], campos)
        except ErroApi as exc:
            self.contagem["falhas"] += 1
            log.error("falha ao atualizar chamado %s: %s", ref, exc)
            return
        self.contagem[contador] += 1
        log.info("chamado atualizado %s motivo=%s", ref, decisao.motivo)

    def _escalar(self, chamado: dict, decisao: regras.DecisaoChamado) -> None:
        registro = {
            "id_chamado": chamado["id_chamado"],
            "placa": chamado.get("placa"),
            "area": chamado.get("area_piloto"),
            "situacao_detectada": chamado.get("situacao_detectada"),
            "dias_em_aberto": round(decisao.dias_em_aberto, 1),
            "prazo_dias": decisao.prazo_dias,
            "registrado_em": self.agora.isoformat(),
        }
        self.escalonamentos.append(registro)
        self.contagem["escalados"] += 1
        log.warning("ESCALONAMENTO prazo vencido id=%s placa=%s area=%s dias_em_aberto=%.1f "
                    "prazo_dias=%d", registro["id_chamado"], registro["placa"], registro["area"],
                    registro["dias_em_aberto"], registro["prazo_dias"])

    def _erro_de_fase(self, fase: str, exc: Exception) -> None:
        self.erros.append(f"{fase}: {exc}")
        log.error("fase %s abortada: %s", fase, exc)


def executar(
    cliente: ApiCliente,
    dir_saida: Path,
    *,
    simular: bool = False,
    relogio: Callable[[], datetime] = agora,
    cronometro: Callable[[], float] = time.perf_counter,
) -> dict:
    """Roda uma execução completa e devolve o resumo (também gravado em `dir_saida`)."""
    inicio, t0 = relogio(), cronometro()
    log.info("início da execução%s", " em modo simulação (sem POST/PATCH)" if simular else "")
    execucao = Execucao(cliente, inicio, simular)
    execucao.processar_fila()
    execucao.acompanhar_chamados()

    dir_saida.mkdir(parents=True, exist_ok=True)
    if execucao.escalonamentos:
        gravar_escalonamentos(dir_saida / f"escalonamentos_{inicio:%Y-%m-%d}.json",
                              execucao.escalonamentos)
    resumo = {
        "inicio": inicio.isoformat(),
        "fim": relogio().isoformat(),
        "duracao_s": round(cronometro() - t0, 3),
        "simulacao": simular,
        "contagem": execucao.contagem,
        "erros": execucao.erros,
    }
    _gravar_json(dir_saida / f"execucao_{inicio:%Y%m%d_%H%M%S}.json", resumo)
    log.info("resumo: %s duracao_s=%.3f",
             " ".join(f"{k}={v}" for k, v in execucao.contagem.items()), resumo["duracao_s"])
    if execucao.erros:
        log.error("execução terminou com %d erro(s) de fase", len(execucao.erros))
    return resumo


def gravar_escalonamentos(arquivo: Path, novos: list[dict]) -> None:
    """Acrescenta ao arquivo do dia, um registro por id_chamado (a última execução vence)."""
    atuais: list = []
    if arquivo.exists():
        try:
            lido = json.loads(arquivo.read_text(encoding="utf-8"))
            atuais = lido if isinstance(lido, list) else []
        except ValueError:
            log.warning("arquivo de escalonamentos ilegível, será recriado: %s", arquivo.name)
    por_id = {r.get("id_chamado"): r for r in atuais if isinstance(r, dict)}
    por_id.update({r["id_chamado"]: r for r in novos})
    _gravar_json(arquivo, list(por_id.values()))


def _gravar_json(arquivo: Path, conteudo: object) -> None:
    """Escrita atômica: arquivo temporário + replace."""
    temporario = arquivo.with_suffix(".tmp")
    temporario.write_text(json.dumps(conteudo, ensure_ascii=False, indent=2), encoding="utf-8")
    temporario.replace(arquivo)
